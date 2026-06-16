import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import { logger } from './lib/logger';
import { registerRoutes } from './app/routes';

// validate env (throws if missing)
import '../config/env';

const server = Fastify({ logger: logger as any });

async function build() {
  await server.register(sensible);
  await server.register(cors, { origin: process.env.FRONTEND_URL || '*' });

  // register plugins
  // observability: metrics + Sentry - register early
  await server.register((await import('./plugins/metrics')).default);
  await server.register((await import('./plugins/sentry')).default);

  // security
  await server.register((await import('@fastify/helmet')).default);

  await server.register((await import('./plugins/validation')).default);
  await server.register((await import('./plugins/prisma')).default);
  await server.register((await import('./plugins/rateLimit')).default);

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

  // Error handler
  server.setErrorHandler((err, req, reply) => {
    server.log.error(err);
    if ((err as any).statusCode) reply.status((err as any).statusCode).send({ error: (err as any).message });
    else reply.status(500).send({ error: 'Internal Server Error' });
  });

  return server;
}

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;

build()
  .then((s) => s.listen({ port: PORT, host: '0.0.0.0' }))
  .then(() => logger.info(`API running on port ${PORT}`))
  .catch((err) => {
  console.error('STARTUP ERROR:');
  console.error(err);

  logger.error(err);

  process.exit(1);
});
