// ============================================================
// apps/api/src/modules/invites/routes.ts  (prefix /invites)
// Endpoints PÚBLICOS de invitación: preview + aceptar.
// (Los de gestión del host — crear/listar/revocar — viven en rooms/routes.ts)
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../lib/db';
import { authMiddleware } from '../../middlewares/auth';
import { inviteStatus, consumeInvite } from '../../lib/inviteStore';
import { upsertRoomMember } from '../../lib/members';

async function countOnline(fastify: any, roomId: string): Promise<number> {
  try {
    const sockets = await fastify.io.in(roomId).fetchSockets();
    return new Set(sockets.map((s: any) => s.data?.userId).filter(Boolean)).size;
  } catch { return 0; }
}

const router: FastifyPluginAsync = async (fastify) => {

  // ── GET /:code — Vista previa de la invitación (pública) ──
  fastify.get('/:code', async (request, reply) => {
    const { code } = request.params as any;
    const { invite, valid, reason } = inviteStatus(code);
    if (!invite) return reply.status(404).send({ valid: false, reason: 'not_found' });

    const room = await prisma.room.findUnique({
      where: { id: invite.roomId },
      select: { id: true, name: true, description: true, isPrivate: true, _count: { select: { members: true } } },
    });
    if (!room) return reply.status(404).send({ valid: false, reason: 'not_found' });

    return reply.send({
      valid,
      reason,
      invite: { code: invite.code, expiresAt: invite.expiresAt, maxUses: invite.maxUses, uses: invite.uses },
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
        isPrivate: room.isPrivate,
        memberCount: room._count.members,
        onlineCount: await countOnline(fastify, room.id),
      },
    });
  });

  // ── POST /:code/accept — Aceptar y entrar (requiere identidad) ──
  fastify.post('/:code/accept', { preHandler: authMiddleware }, async (request, reply) => {
    const { code } = request.params as any;
    const userId = (request as any).user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const { invite, valid, reason } = inviteStatus(code);
    if (!valid || !invite) {
      return reply.status(410).send({ error: 'invite_invalid', reason: reason || 'invalid' });
    }

    const room = await prisma.room.findUnique({ where: { id: invite.roomId } });
    if (!room) return reply.status(404).send({ error: 'Room not found' });

    // Si ya es miembro (o el owner), no consume un uso de la invitación.
    const alreadyMember =
      room.ownerId === userId ||
      !!(await prisma.roomMember.findFirst({ where: { roomId: room.id, userId }, select: { id: true } }));

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
    const member = await upsertRoomMember(room.id, userId, user?.username || 'Invitado');

    if (!alreadyMember) consumeInvite(code);

    return reply.send({ ok: true, room: { id: room.id, name: room.name }, member });
  });
};

export default router;
