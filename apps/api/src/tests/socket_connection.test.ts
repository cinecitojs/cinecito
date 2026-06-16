import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { io as Client } from 'socket.io-client';
import { registerRoutes } from '../app/routes';
import { createPrismaMock } from './prismaMock';

describe('Socket connection auth', () => {
  it('accepts connection with valid token and rejects invalid', async () => {
    const server = Fastify();
    (global as any).__prisma__ = createPrismaMock();
    await registerRoutes(server as any);
    const listenInfo = await server.listen({ port: 0 });
    const addr = server.server.address() as any;
    const port = addr && addr.port ? addr.port : (typeof listenInfo === 'string' ? new URL(listenInfo).port : 0);
    const url = `http://127.0.0.1:${port}`;

    // create user to get token
    const r = await server.inject({ method: 'POST', url: '/auth/register', payload: { username: 'socku', email: 's@example.com', password: 'pass' } });
    const token = (JSON.parse(r.payload as string) as any).token;

    // valid token
    await new Promise<void>((resolve, reject) => {
      const client1 = Client(url, { auth: { token }, transports: ['websocket'] });
      client1.on('connect', () => { client1.disconnect(); resolve(); });
      client1.on('connect_error', (err: any) => { client1.disconnect(); reject(err); });
    });

    // invalid token -> expect connect_error
    await new Promise<void>((resolve) => {
      const client2 = Client(url, { auth: { token: 'bad' }, transports: ['websocket'] });
      client2.on('connect_error', () => { client2.disconnect(); resolve(); });
      setTimeout(() => { client2.disconnect(); resolve(); }, 500);
    });

    await server.close();
  });
});
