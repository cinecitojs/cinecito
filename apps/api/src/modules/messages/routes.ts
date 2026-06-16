import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../lib/db';
import { authMiddleware } from '../../middlewares/auth';
import { isMemberOrOwner } from '../../lib/acl';

const router: FastifyPluginAsync = async (fastify) => {
  // Create message: persist then emit
  fastify.post('/', { preHandler: authMiddleware }, async (request, reply) => {
    const { roomId, content } = request.body as any;
    if (!roomId || !content) return reply.status(400).send({ error: 'roomId and content required' });
    const userId = (request as any).user?.id || null;
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return reply.status(404).send({ error: 'Room not found' });
    if (room.isPrivate) {
      const allowed = await isMemberOrOwner(roomId, userId);
      if (!allowed) return reply.status(403).send({ error: 'Forbidden' });
    }
    const msg = await prisma.message.create({ data: { roomId, userId, content } });
    // Emit persisted message
    fastify.io?.to(roomId).emit('message', msg);
    return reply.send(msg);
  });

  // List messages paginated
  fastify.get('/', async (request, reply) => {
    const { roomId, page = '1', limit = '50' } = request.query as any;
    if (!roomId) return reply.status(400).send({ error: 'roomId required' });
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return reply.status(404).send({ error: 'Room not found' });
    if (room.isPrivate) {
      await authMiddleware(request, reply);
      if ((reply as any).sent) return;
      const userId = (request as any).user?.id;
      const allowed = await isMemberOrOwner(roomId, userId);
      if (!allowed) return reply.status(403).send({ error: 'Forbidden' });
    }
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(200, parseInt(limit, 10) || 50);
    const messages = await prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      take: l,
      skip: (p - 1) * l,
    });
    return reply.send({ messages, page: p, limit: l });
  });
};

export default router;
