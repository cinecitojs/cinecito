import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../lib/db';
import { authMiddleware } from '../../middlewares/auth';
import { isMemberOrOwner } from '../../lib/acl';

const router: FastifyPluginAsync = async (fastify) => {
  // Create room - require auth and set owner from authenticated user
  fastify.post('/', { preHandler: authMiddleware }, async (request, reply) => {
    const { name, isPrivate } = request.body as any;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const ownerId = (request as any).user?.id || null;
    const data: any = { name, code, isPrivate: !!isPrivate };
    if (ownerId) data.ownerId = ownerId;
    const room = await prisma.room.create({ data });
    reply.send(room);
  });

  // Join via code (public/private flow)
  fastify.post('/join', async (request, reply) => {
    const { code, displayName } = request.body as any;
    const room = await prisma.room.findUnique({ where: { code } });
    if (!room) return reply.status(404).send({ error: 'Room not found' });

    if (room.isPrivate) {
      // require auth for private rooms and only allow owner to add members
      await authMiddleware(request, reply);
      if ((reply as any).sent) return;
      const userId = (request as any).user?.id;
      // only owner can add members (policy)
      if (room.ownerId !== userId) return reply.status(403).send({ error: 'Forbidden' });
      // owner adding themself or others: if displayName and no userId, create anonymous member; if userId provided, attach user
      const member = await prisma.roomMember.create({ data: { roomId: room.id, displayName, userId } });
      return reply.send({ room, member });
    }

    // public room: allow anonymous join (preserve behavior)
    const member = await prisma.roomMember.create({ data: { roomId: room.id, displayName, userId: (request as any).user?.id || null } });
    reply.send({ room, member });
  });

  // Get room details
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as any;
    const room = await prisma.room.findUnique({ where: { id }, include: { members: true } });
    if (!room) return reply.status(404).send({ error: 'Not found' });

    if (room.isPrivate) {
      await authMiddleware(request, reply);
      if ((reply as any).sent) return;
      const userId = (request as any).user?.id;
      const allowed = await isMemberOrOwner(room.id, userId);
      if (!allowed) return reply.status(403).send({ error: 'Forbidden' });
    }

    reply.send(room);
  });

  // Delete room - require auth and ownership or ADMIN role
  fastify.delete('/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as any;
    const userId = (request as any).user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });
    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) return reply.status(404).send({ error: 'Not found' });
    if (room.ownerId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' });
    }
    await prisma.room.delete({ where: { id } });
    reply.send({ ok: true });
  });

  // Transfer host - require auth and ownership or ADMIN
  fastify.post('/transfer-host', { preHandler: authMiddleware }, async (request, reply) => {
    const { roomId, newOwnerId } = request.body as any;
    const userId = (request as any).user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return reply.status(404).send({ error: 'Not found' });
    if (room.ownerId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' });
    }
    await prisma.room.update({ where: { id: roomId }, data: { ownerId: newOwnerId } });
    reply.send({ ok: true });
  });
};

export default router;
