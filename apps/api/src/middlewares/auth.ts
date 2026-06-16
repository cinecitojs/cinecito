import { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const auth = request.headers.authorization;
  if (!auth) return reply.status(401).send({ error: 'Unauthorized' });
  const token = auth.replace(/^Bearer\s+/, '');
  try {
    const payload: any = jwt.verify(token, process.env.JWT_SECRET as string);
    (request as any).user = { id: payload.sub };
  } catch (err) {
    return reply.status(401).send({ error: 'Invalid token' });
  }
}
