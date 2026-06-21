// ============================================================
// apps/api/src/modules/messages/routes.ts  — FASE 3
// Paginación cursor-based para scroll infinito hacia atrás
// REEMPLAZA el archivo de Fase 1
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/db';
import { authMiddleware } from '../../middlewares/auth';
import { isMemberOrOwner } from '../../lib/acl';
import { validateBody } from '../../lib/validate';

const postMessageSchema = z.object({
  roomId: z.string().min(1, 'requerido'),
  content: z.string().trim().min(1, 'requerido').max(500, 'máximo 500 caracteres'),
});

const router: FastifyPluginAsync = async (fastify) => {

  // ── GET / — Mensajes con paginación doble ────────────────
  // Modo 1 (inicial):  ?roomId=X&limit=50
  //   → últimos 50 mensajes en orden cronológico
  // Modo 2 (scroll):   ?roomId=X&before=<ISO>&limit=50
  //   → mensajes anteriores al cursor para scroll infinito
  fastify.get('/', async (request, reply) => {
    const { roomId, limit = '50', before } = request.query as any;
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

    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    if (before) {
      // ── Modo scroll hacia atrás ──────────────────────────
      // Trae mensajes anteriores al cursor (para "cargar más" al scrollear arriba)
      const messages = await prisma.message.findMany({
        where: {
          roomId,
          createdAt: { lt: new Date(before) },
        },
        orderBy:  { createdAt: 'desc' }, // desc para tomar los más recientes antes del cursor
        take:     l,
        include:  { user: { select: { id: true, username: true, avatar: true } } },
      });
      // Devolver en orden cronológico (más antiguos primero)
      const ordered = messages.reverse();
      const hasMore = messages.length === l;
      const nextCursor = ordered.length > 0 ? ordered[0].createdAt.toISOString() : null;
      return reply.send({ messages: ordered, hasMore, nextCursor });
    }

    // ── Modo inicial: últimos N mensajes ─────────────────
    const messages = await prisma.message.findMany({
      where:    { roomId },
      orderBy:  { createdAt: 'desc' },
      take:     l,
      include:  { user: { select: { id: true, username: true, avatar: true } } },
    });
    const ordered  = messages.reverse(); // orden cronológico
    const hasMore  = messages.length === l;
    const nextCursor = ordered.length > 0 ? ordered[0].createdAt.toISOString() : null;
    return reply.send({ messages: ordered, hasMore, nextCursor });
  });

  // ── POST / — Crear mensaje vía REST (backup) ─────────────
  fastify.post('/', { preHandler: [authMiddleware, validateBody(postMessageSchema)] }, async (request, reply) => {
    const { roomId, content } = request.body as z.infer<typeof postMessageSchema>;

    const userId = (request as any).user?.id || null;
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return reply.status(404).send({ error: 'Room not found' });

    if (room.isPrivate) {
      const allowed = await isMemberOrOwner(roomId, userId);
      if (!allowed) return reply.status(403).send({ error: 'Forbidden' });
    }

    const msg = await prisma.message.create({
      data: { roomId, userId, content },
      include: { user: { select: { id: true, username: true, avatar: true } } },
    });

    (fastify as any).io?.to(roomId).emit('message', msg);
    return reply.status(201).send(msg);
  });
};

export default router;
