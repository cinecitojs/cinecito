import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import { logger } from './lib/logger';
import { registerRoutes } from './app/routes';
import { isDbUnreachable, DB_DOWN_MESSAGE, GENERIC_ERROR_MESSAGE } from './lib/errors';

// En desarrollo permitimos cualquier origen (acceso multi-dispositivo por LAN:
// el celular/tablet abren la web desde la IP local, no desde localhost).
// En producción se restringe a FRONTEND_URL.
const corsOrigin =
  process.env.NODE_ENV === 'production' ? (process.env.FRONTEND_URL || false) : true;

// validate env (throws if missing)
import '../config/env';

// Detrás de un proxy (nginx, Cloudflare, Render…) hay que habilitar
// TRUST_PROXY para que request.ip sea la IP real del cliente — de lo
// contrario el rate-limit por IP de /auth/guest vería siempre la IP del
// proxy. Opt-in a propósito: confiar en X-Forwarded-For de proxies no
// controlados permite spoofear la IP.
//   TRUST_PROXY=true        → confía en el primer proxy
//   TRUST_PROXY=2           → número de saltos
//   TRUST_PROXY=10.0.0.0/8  → lista de IPs/CIDR de confianza
function parseTrustProxy(v?: string): boolean | string | number {
  if (!v || v === 'false') return false;
  if (v === 'true') return true;
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}

const server = Fastify({ logger: logger as any, trustProxy: parseTrustProxy(process.env.TRUST_PROXY) });

async function build() {
  await server.register(sensible);
  await server.register(cors, { origin: corsOrigin });

  // register plugins
  // observability: metrics + Sentry - register early
  await server.register((await import('./plugins/metrics')).default);
  await server.register((await import('./plugins/sentry')).default);

  // security
  await server.register((await import('@fastify/helmet')).default);

  await server.register((await import('./plugins/validation')).default);
  await server.register((await import('./plugins/prisma')).default);
  await server.register((await import('./plugins/rateLimit')).default);

  // Job programado: limpieza de invitados obsoletos (services/guestCleanup)
  await server.register((await import('./plugins/guestCleanup')).default);

  // Register routes
  await registerRoutes(server as any);

  // Health endpoint
  server.get('/health', async () => {
    try {
      const { checkHealth } = await import('./lib/health');
      const services = await checkHealth();
      const ok = services.db && services.redis;
      return { status: ok ? 'ok' : 'degraded', services, timestamp: new Date().toISOString() };
    } catch (err) {
      server.log.error('health check failed', err as any);
      return { status: 'error', error: String(err) };
    }
  });

  // Error handler — registra TODO en el servidor (dev: stack completo vía pino),
  // pero al cliente nunca le filtra host/puerto/stack: sólo mensajes amigables.
  server.setErrorHandler((err, req, reply) => {
    req.log.error({ err }, 'request error');

    // Base de datos inalcanzable → 503 con mensaje de reintento.
    if (isDbUnreachable(err)) {
      return reply.status(503).send({ error: DB_DOWN_MESSAGE });
    }

    const status = (err as any).statusCode as number | undefined;

    // Errores de cliente (validación 4xx, auth, conflictos): su mensaje es seguro.
    if (status && status >= 400 && status < 500) {
      return reply.status(status).send({ error: (err as any).message });
    }

    // Cualquier otro error del servidor: mensaje genérico, sin internos.
    return reply.status(status && status >= 500 ? status : 500).send({ error: GENERIC_ERROR_MESSAGE });
  });

  return server;
}

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;

async function start() {
  try {
    const s = await build();
    await s.listen({ port: PORT, host: '0.0.0.0' });
    logger.info(`API running on port ${PORT}`);

    // Cierre elegante: ts-node-dev manda SIGTERM en cada hot-reload. Si cerramos
    // el server ANTES de que el nuevo proceso re-bindee, se libera el puerto y NO
    // hay EADDRINUSE recurrente (raíz del conflicto en Windows). Idem Ctrl+C.
    const shutdown = async (sig: string) => {
      logger.info(`${sig} recibido — cerrando servidor…`);
      try { await s.close(); } catch { /* */ }
      process.exit(0);
    };
    process.once('SIGINT',  () => void shutdown('SIGINT'));
    process.once('SIGTERM', () => void shutdown('SIGTERM'));
  } catch (err: any) {
    if (err?.code === 'EADDRINUSE') {
      logger.error(
        `El puerto ${PORT} ya está en uso. ¿Hay otra instancia del backend corriendo? ` +
        `Cerrala, o definí otro puerto con la variable de entorno PORT.`,
      );
    } else {
      console.error('STARTUP ERROR:');
      console.error(err);
      logger.error(err);
    }
    process.exit(1);
  }
}

start();
