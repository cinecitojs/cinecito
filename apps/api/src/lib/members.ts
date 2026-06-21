// ============================================================
// apps/api/src/lib/members.ts
// Alta/actualización idempotente de miembros sin depender del input
// compuesto `roomId_userId` del cliente Prisma (que puede no existir si
// el cliente está desincronizado con el esquema). El @@unique de la DB
// sigue protegiendo contra duplicados reales en carreras concurrentes.
// ============================================================

import { prisma } from './db';

export async function upsertRoomMember(
  roomId: string,
  userId: string,
  displayName: string,
  patch: { isHost?: boolean } = {},
) {
  const existing = await prisma.roomMember.findFirst({ where: { roomId, userId } });
  if (existing) {
    return Object.keys(patch).length
      ? prisma.roomMember.update({ where: { id: existing.id }, data: patch })
      : existing;
  }
  try {
    return await prisma.roomMember.create({ data: { roomId, userId, displayName, ...patch } });
  } catch {
    // Carrera: otro proceso lo creó (lo bloquea el @@unique de la DB). Re-buscar.
    const again = await prisma.roomMember.findFirst({ where: { roomId, userId } });
    if (again) {
      return Object.keys(patch).length
        ? prisma.roomMember.update({ where: { id: again.id }, data: patch })
        : again;
    }
    throw new Error('No se pudo crear/actualizar el miembro');
  }
}

// Deja a `userId` como único host de la sala.
export async function setSoleHost(roomId: string, userId: string, displayName: string) {
  await prisma.roomMember.updateMany({ where: { roomId }, data: { isHost: false } });
  return upsertRoomMember(roomId, userId, displayName, { isHost: true });
}
