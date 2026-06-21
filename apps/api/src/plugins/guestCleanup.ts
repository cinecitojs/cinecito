// ============================================================
// apps/api/src/plugins/guestCleanup.ts
// Job programado en proceso: corre cleanupStaleGuests() cada
// GUEST_CLEANUP_INTERVAL_MS. Se desactiva en tests y es opt-out vía
// GUEST_CLEANUP_ENABLED=false (ej. si se prefiere correr el script
// `npm run cleanup:guests` desde un cron externo).
// ============================================================

import fp from 'fastify-plugin';
import { cleanupStaleGuests } from '../services/guestCleanup';

const HOUR_MS = 60 * 60 * 1000;

export default fp(async function guestCleanupPlugin(fastify) {
  const enabled =
    process.env.NODE_ENV !== 'test' && process.env.GUEST_CLEANUP_ENABLED !== 'false';
  if (!enabled) {
    fastify.log.info('guestCleanup: job en proceso desactivado');
    return;
  }

  const intervalMs = Number(process.env.GUEST_CLEANUP_INTERVAL_MS) || HOUR_MS;
  const ttlHours = Number(process.env.GUEST_TOKEN_TTL_HOURS) || 24;
  const batchSize = Number(process.env.GUEST_CLEANUP_BATCH_SIZE) || 500;

  let running = false; // evita solapamiento si una corrida tarda más que el intervalo
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await cleanupStaleGuests({ ttlHours, batchSize, logger: fastify.log });
    } catch (err) {
      fastify.log.error({ err }, 'guestCleanup: corrida falló');
    } finally {
      running = false;
    }
  };

  // Primera corrida poco después del arranque (no bloquea el listen).
  const kickoff = setTimeout(run, 10_000);
  const timer = setInterval(run, intervalMs);
  // unref(): que estos timers no mantengan vivo el proceso por sí solos.
  kickoff.unref?.();
  timer.unref?.();

  fastify.addHook('onClose', async () => {
    clearTimeout(kickoff);
    clearInterval(timer);
  });

  fastify.log.info({ intervalMs, ttlHours, batchSize }, 'guestCleanup: job programado');
});
