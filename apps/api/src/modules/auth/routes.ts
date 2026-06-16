import { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/db';

const router: FastifyPluginAsync = async (fastify) => {
  fastify.post('/register', async (request, reply) => {
    const { email, username, password } = request.body as any;
    const hashed = password ? await bcrypt.hash(password, 10) : null;
    const user = await prisma.user.create({ data: { email, username, password: hashed } });
    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
    reply.send({ user: { id: user.id, username: user.username, email: user.email }, token });
  });

  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body as any;
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user || !user.password) return reply.status(401).send({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return reply.status(401).send({ error: 'Invalid credentials' });
    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
    reply.send({ user: { id: user.id, username: user.username, email: user.email }, token });
  });

  fastify.get('/me', async (request, reply) => {
    const auth = request.headers.authorization;
    if (!auth) return reply.status(401).send({ error: 'Unauthorized' });
    const token = auth.replace(/^Bearer\s+/, '');
    try {
      const payload: any = jwt.verify(token, process.env.JWT_SECRET as string);
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) return reply.status(404).send({ error: 'Not found' });
      reply.send({ user: { id: user.id, username: user.username, email: user.email } });
    } catch (err) {
      reply.status(401).send({ error: 'Invalid token' });
    }
  });
};

export default router;
