import { prisma } from './db';

export async function isMemberOrOwner(roomId: string, userId?: string | null) {
  if (!userId) return false;
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return false;
  if (room.ownerId === userId) return true;
  const member = await prisma.roomMember.findFirst({ where: { roomId, userId } });
  return !!member;
}
