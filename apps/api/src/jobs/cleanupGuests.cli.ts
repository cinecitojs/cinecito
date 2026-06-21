// ============================================================
// apps/api/src/jobs/cleanupGuests.cli.ts
// Script invocable para borrar invitados obsoletos una sola vez.
//
//   Dev/manual:  npm run cleanup:guests
//   Prod/cron:   node dist/jobs/cleanupGuests.cli.js
//
// Útil para correrlo desde un cron externo (en vez del job en proceso)
// o para drenar a mano un backlog acumulado.
//
// Variables (opcionales): GUEST_TOKEN_TTL_HOURS, GUEST_CLEANUP_BATCH_SIZE.
// ============================================================

// Carga .env y valida las variables imprescindibles (sale si faltan).
import '../../config/env';
import { cleanupStaleGuests } from '../services/guestCleanup';
import { prisma } from '../lib/db';
import { logger } from '../lib/logger';

async function main() {
  const ttlHours = Number(process.env.GUEST_TOKEN_TTL_HOURS) || 24;
  const batchSize = Number(process.env.GUEST_CLEANUP_BATCH_SIZE) || 500;
  // Sin tope de lotes: corrido a mano queremos drenar todo el backlog.
  const result = await cleanupStaleGuests({ ttlHours, batchSize, maxBatches: Number.MAX_SAFE_INTEGER, logger });
  logger.info({ ...result, ttlHours }, 'cleanup-guests: finalizado');
}

main()
  .catch((err) => {
    logger.error({ err }, 'cleanup-guests: falló');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
