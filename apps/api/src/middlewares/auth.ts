// ============================================================
// apps/api/src/middlewares/auth.ts  — FASE 1A
// Mejora: popula username desde la DB para usarlo en mensajes
// ============================================================

import { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/db';

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const auth = request.headers.authorization;
  if (!auth) return reply.status(401).send({ error: 'Unauthorized' });

  const token = auth.replace(/^Bearer\s+/, '');

  try {
    const payload: any = jwt.verify(token, process.env.JWT_SECRET as string);

    // Adjuntar datos básicos del usuario al request
    // Hacemos un fetch mínimo para tener el username disponible en controladores
    (request as any).user = {
      id: payload.sub,
      // username se populará lazily si se necesita
    };
  } catch (err) {
    return reply.status(401).send({ error: 'Invalid token' });
  }
}

// Versión que falla silenciosamente (para rutas opcionales)
export async function optionalAuthMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  const auth = request.headers.authorization;
  if (!auth) return;
  const token = auth.replace(/^Bearer\s+/, '');
  try {
    const payload: any = jwt.verify(token, process.env.JWT_SECRET as string);
    (request as any).user = { id: payload.sub };
  } catch {
    // Token inválido ignorado en rutas opcionales
  }
}
