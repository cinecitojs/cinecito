// ============================================================
// apps/api/src/services/guestCleanup.ts
// Limpieza de usuarios invitados (isGuest=true) obsoletos.
//
// POST /auth/guest crea una fila User real por cada invitado. Sin
// limpieza, la tabla User crece sin control y el endpoint es abusable.
// Este servicio borra invitados que ya no sirven para nada:
//
//   1. isGuest = true
//   2. createdAt más viejo que `ttlHours` (por defecto 24h, igual que
//      la expiración del token de guest). Pasado ese tiempo el token
//      JWT ya expiró: el invitado NO puede volver a autenticarse, así
//      que tampoco puede crear nuevos RoomMember ligados a su userId.
//      Por eso no hay carrera entre seleccionar y borrar.
//   3. Sin RoomMember asociado (`members: { none: {} }`). Si todavía
//      figura como miembro de alguna sala, se conserva: típicamente es
//      un invitado que sí participó. Los que nunca se unieron (spam /
//      abandonados) no tienen ninguna fila RoomMember y son los que
//      borramos.
//
// Integridad: tanto RoomMember.userId como Message.userId son
// onDelete: SetNull, así que borrar el User es seguro — Postgres pone
// esas FKs en NULL automáticamente sin romper nada. (Los invitados que
// borramos no tienen RoomMember por el filtro; los Message que pudieran
// haber dejado en salas públicas quedan como anónimos, igual que ya
// ocurre con los invitados sin cuenta.)
// ============================================================

import { prisma } from '../lib/db';

export interface CleanupOptions {
  /** Borra invitados más viejos que esto. Default 24 (igual al TTL del token). */
  ttlHours?: number;
  /** Cantidad de IDs por lote de borrado. Default 500. */
  batchSize?: number;
  /** Tope de lotes por invocación (evita corridas eternas). Default 20. */
  maxBatches?: number;
  /** Inyectable para tests deterministas. Default new Date(). */
  now?: Date;
  /** Logger opcional (ej. fastify.log). Si falta, no loguea. */
  logger?: { info: (...a: any[]) => void; error: (...a: any[]) => void };
}

export interface CleanupResult {
  deleted: number;
  batches: number;
}

const DEFAULTS = { ttlHours: 24, batchSize: 500, maxBatches: 20 };

export async function cleanupStaleGuests(opts: CleanupOptions = {}): Promise<CleanupResult> {
  const ttlHours = opts.ttlHours ?? DEFAULTS.ttlHours;
  const batchSize = Math.max(1, opts.batchSize ?? DEFAULTS.batchSize);
  const maxBatches = Math.max(1, opts.maxBatches ?? DEFAULTS.maxBatches);
  const now = opts.now ?? new Date();
  const cutoff = new Date(now.getTime() - ttlHours * 60 * 60 * 1000);

  let deleted = 0;
  let batches = 0;

  for (; batches < maxBatches; batches++) {
    // Seleccionamos IDs por lotes en vez de un único DELETE gigante:
    // acota el tamaño de cada transacción en tablas grandes y nos da
    // un conteo observable.
    const stale = await prisma.user.findMany({
      where: {
        isGuest: true,
        createdAt: { lt: cutoff },
        members: { none: {} }, // sin ninguna fila RoomMember
      },
      select: { id: true },
      take: batchSize,
    });

    if (stale.length === 0) break;

    const res = await prisma.user.deleteMany({
      where: { id: { in: stale.map((u) => u.id) } },
    });
    deleted += res.count;

    // Último lote (vino incompleto): no hay más candidatos.
    if (stale.length < batchSize) break;
  }

  if (deleted > 0) {
    opts.logger?.info(
      { deleted, batches: batches + 1, ttlHours, cutoff: cutoff.toISOString() },
      'guestCleanup: invitados obsoletos borrados',
    );
  }

  return { deleted, batches };
}
