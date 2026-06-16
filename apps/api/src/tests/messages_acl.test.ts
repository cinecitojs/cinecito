import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { registerRoutes } from '../app/routes';
import { createPrismaMock } from './prismaMock';

describe('POST /messages access control', () => {
  it('rejects posting by non-member to a private room', async () => {
    const server = Fastify();
    (global as any).__prisma__ = createPrismaMock();
    await registerRoutes(server as any);
    // owner creates private room
    const ro = await server.inject({ method: 'POST', url: '/auth/register', payload: { username: 'owner3', email: 'o3@example.com', password: 'pass' } });
    const ownerToken = (JSON.parse(ro.payload as string) as any).token;
    const roomRes = await server.inject({ method: 'POST', url: '/rooms', headers: { Authorization: `Bearer ${ownerToken}` }, payload: { name: 'Priv3', isPrivate: true } });
    const room = JSON.parse(roomRes.payload as string) as any;
    // another user tries to post
    const ru = await server.inject({ method: 'POST', url: '/auth/register', payload: { username: 'u3', email: 'u3@example.com', password: 'pass' } });
    const token3 = (JSON.parse(ru.payload as string) as any).token;
    const res = await server.inject({ method: 'POST', url: '/messages', headers: { Authorization: `Bearer ${token3}` }, payload: { roomId: room.id, content: 'hello' } });
    expect(res.statusCode).toBe(403);
    await server.close();
  });
});
