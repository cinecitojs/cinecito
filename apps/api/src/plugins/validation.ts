import fp from 'fastify-plugin';
import { z } from 'zod';

export default fp(async function (fastify) {
  fastify.decorate('validate', (schema: any) => {
    return async function (request: any, reply: any) {
      try {
        schema.parse(request.body);
      } catch (err: any) {
        reply.status(400).send({ error: err.errors || err.message });
      }
    };
  });
});
