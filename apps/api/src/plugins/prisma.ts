import fp from 'fastify-plugin';
import { prisma } from '../lib/db';

export default fp(async function (fastify) {
  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});
