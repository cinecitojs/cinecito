import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Solo dos variables son realmente imprescindibles para arrancar.
// Todo lo demás es opcional: si falta, la feature asociada se degrada
// (ej. sin R2 no se pueden subir archivos, pero YouTube/Vimeo/HLS/MP4 siguen funcionando).
const schema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatorio'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET debe tener al menos 8 caracteres'),

  REDIS_URL: z.string().optional(),

  // Almacenamiento de archivos (opcional)
  R2_ENDPOINT: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),

  FRONTEND_URL: z.string().optional(),
  PORT: z.string().optional(),

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
