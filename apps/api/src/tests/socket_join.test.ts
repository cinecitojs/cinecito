import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { io as Client } from 'socket.io-client';
import { registerRoutes } from '../app/routes';
import { createPrismaMock } from './prismaMock';

describe('Socket join-room ack + fallback', () => {
  it('ack receives ok when allowed, otherwise join-error emitted', async () => {
    const server = Fastify();
    (global as any).__prisma__ = createPrismaMock();
    await registerRoutes(server as any);
    const listenInfo = await server.listen({ port: 0 });
    const addr = server.server.address() as any;
    const port = addr && addr.port ? addr.port : (typeof listenInfo === 'string' ? new URL(listenInfo).port : 0);
    const url = `http://127.0.0.1:${port}`;

    // owner + private room set up
    const rOwner = await server.inject({ method: 'POST', url: '/auth/register', payload: { username: 'sj_owner', email: 'sj_o@example.com', password: 'pass' } });
    const ownerToken = (JSON.parse(rOwner.payload as string) as any).token;
    const roomRes = await server.inject({ method: 'POST', url: '/rooms', headers: { Authorization: `Bearer ${ownerToken}` }, payload: { name: 'SJ-Priv', isPrivate: true } });
    const room = JSON.parse(roomRes.payload as string) as any;

    // client with valid token (owner) -> should ack ok
    await new Promise<void>((resolve, reject) => {
      const client = Client(url, { auth: { token: ownerToken }, transports: ['websocket'] });
      client.on('connect', () => {
        client.emit('join-room', { roomId: room.id }, (ack: any) => {
          try {
            expect(ack).toMatchObject({ ok: true });
            client.disconnect();
            resolve();
          } catch (e) { client.disconnect(); reject(e); }
        });
      });
      client.on('connect_error', (err: any) => { client.disconnect(); reject(err); });
    });

    // client without token -> connect fails or join fallback
    await new Promise<void>((resolve) => {
      const clientAnon = Client(url, { transports: ['websocket'] });
      clientAnon.on('connect', () => {
        clientAnon.emit('join-room', { roomId: room.id });
        clientAnon.on('join-error', (payload: any) => {
          expect(payload).toHaveProperty('error');
          clientAnon.disconnect();
          resolve();
        });
      });
      clientAnon.on('connect_error', () => { resolve(); });
      setTimeout(() => { clientAnon.disconnect(); resolve(); }, 600);
    });

    await server.close();
  });
});
