import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Solo dos variables son realmente imprescindibles para arrancar.
// Todo lo demás es opcional: si falta, la feature asociada se degrada
// (ej. sin R2 no se pueden subir archivos, pero YouTube/Vimeo/HLS/MP4 siguen funcionando).
const schema = z.object({
  // production | development | test. En producción se restringe CORS, se exige
  // FRONTEND_URL y Prisma usa una única instancia.
  NODE_ENV: z.enum(['production', 'development', 'test']).optional(),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatorio'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET debe tener al menos 8 caracteres'),

  REDIS_URL: z.string().optional(),

  // Almacenamiento de archivos (opcional)
  R2_ENDPOINT: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),

  // Origen permitido por CORS en producción (ej. https://cinecito-web.onrender.com).
  // Obligatorio en producción: si falta, el navegador bloquea TODA la web (ver guard abajo).
  FRONTEND_URL: z.string().optional(),
  PORT: z.string().optional(),

  // ── Panel de administración ───────────────────────────────────
  // Lista separada por comas: estos correos se auto-promueven a ADMIN al iniciar sesión.
  ADMIN_EMAILS: z.string().optional(),

  // ── Apoyo voluntario / pagos (todas opcionales; habilitan cada proveedor) ──
  KOFI_VERIFICATION_TOKEN: z.string().optional(),  // Ko-fi → Webhooks → Verification Token
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  MP_WEBHOOK_SECRET: z.string().optional(),         // Mercado Pago
  SUPPORT_DEV_GRANT: z.string().optional(),         // 'true' permite conceder tiers sin pago (NO usar en prod)
  SUPPORT_CHECKOUT_URL: z.string().optional(),
  SUPPORT_CHECKOUT_URL_AMIGO: z.string().optional(),
  SUPPORT_CHECKOUT_URL_COLABORADOR: z.string().optional(),
  SUPPORT_CHECKOUT_URL_PATROCINADOR: z.string().optional(),
  SUPPORT_RATELIMIT_MAX: z.string().optional(),
  SUPPORT_RATELIMIT_WINDOW: z.string().optional(),

  // ── Observabilidad (opcional) ─────────────────────────────────
  SENTRY_DSN: z.string().optional(),
  METRICS_BEARER_TOKEN: z.string().optional(),      // si se define, /metrics exige este Bearer

  // ── Llamadas de voz (opcional, NAT estricto) ──────────────────
  TURN_URL: z.string().optional(),
  TURN_USERNAME: z.string().optional(),
  TURN_CREDENTIAL: z.string().optional(),

  // Confiar en cabeceras de proxy para obtener la IP real del cliente.
  // Necesario para que el rate-limit por IP de /auth/guest funcione en
  // producción detrás de un proxy. Ver parseTrustProxy en src/index.ts.
  TRUST_PROXY: z.string().optional(),

  // Limpieza de invitados (services/guestCleanup + plugins/guestCleanup).
  GUEST_CLEANUP_ENABLED: z.string().optional(),      // 'false' desactiva el job en proceso
  GUEST_CLEANUP_INTERVAL_MS: z.string().optional(),  // intervalo del job (default 1h)
  GUEST_TOKEN_TTL_HOURS: z.string().optional(),      // antigüedad para borrar (default 24, = TTL del token)
  GUEST_CLEANUP_BATCH_SIZE: z.string().optional(),   // IDs por lote de borrado (default 500)

  // Rate-limit específico de POST /auth/guest (por IP).
  GUEST_RATELIMIT_MAX: z.string().optional(),        // máx. por ventana (default 10)
  GUEST_RATELIMIT_WINDOW: z.string().optional(),     // ventana, ej. '1 minute' (default '1 minute')

  // Rate-limit de credenciales: POST /auth/login y /auth/register (por IP, anti fuerza bruta).
  AUTH_RATELIMIT_MAX: z.string().optional(),         // máx. por ventana (default 10)
  AUTH_RATELIMIT_WINDOW: z.string().optional(),      // ventana (default '1 minute')
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:');
  for (const issue of parsed.error.issues) {
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;

// Orígenes permitidos por CORS. En producción acepta FRONTEND_URL como LISTA separada
// por comas → permite migrar a un dominio propio sin downtime (ej.
// "https://cinecito-web.onrender.com,https://cinecito.app"). En dev refleja cualquier
// origen (acceso multi-dispositivo por LAN).
export function corsOrigins(): boolean | string[] {
  if (env.NODE_ENV !== 'production') return true;
  const list = (env.FRONTEND_URL || '').split(',').map((s) => s.trim()).filter(Boolean);
  return list.length ? list : false;
}

// ── Guard de producción ───────────────────────────────────────
// En producción, sin FRONTEND_URL el CORS cae a `false` (src/index.ts) y el
// navegador bloquea TODAS las llamadas del frontend → la app queda inservible
// sin error visible. Mejor fallar fuerte y claro al arrancar.
if (env.NODE_ENV === 'production' && !env.FRONTEND_URL) {
  console.error('❌ FRONTEND_URL es obligatorio en producción (origen del frontend para CORS, ej. https://tu-web.onrender.com).');
  process.exit(1);
}

// Un JWT_SECRET corto es forzable por fuerza bruta → tokens falsificables. En
// producción exigimos ≥ 32 caracteres (en dev/local se permite menos por comodidad).
if (env.NODE_ENV === 'production' && env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET debe tener al menos 32 caracteres en producción. Generá uno con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

// Indica si la subida de archivos está disponible (todas las claves R2 presentes)
export const uploadsEnabled = Boolean(
  env.R2_ENDPOINT &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY &&
    env.R2_BUCKET_NAME,
);

if (!uploadsEnabled) {
  console.warn('⚠️  R2 no configurado — la subida de archivos estará deshabilitada (YouTube/Vimeo/HLS/MP4 por URL siguen disponibles).');
}
