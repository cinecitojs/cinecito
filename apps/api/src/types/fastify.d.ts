import type { Server as IOServer } from 'socket.io';

declare module 'fastify' {
  interface FastifyInstance {
    io?: IOServer;
  }
}
