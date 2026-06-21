// ============================================================
// apps/api/src/middlewares/requireAdmin.ts
// preHandler que exige rol ADMIN. Debe ir DESPUÉS de authMiddleware (usa request.user.id).
// ============================================================

import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../lib/db';

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request as any).user?.id;
  if (!userId) { reply.status(401).send({ error: 'Unauthorized' }); return reply; }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user || user.role !== 'ADMIN') {
    reply.status(403).send({ error: 'Solo administradores' });
    return reply;
  }
  (request as any).user.role = 'ADMIN';
}
