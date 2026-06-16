import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { registerRoutes } from '../app/routes';
import { createPrismaMock } from './prismaMock';

describe('POST /rooms/join (private room)', () => {
  it('rejects anonymous join to private room', async () => {
    const server = Fastify();
    (global as any).__prisma__ = createPrismaMock();
    await registerRoutes(server as any);
    // create owner and private room
    const r = await server.inject({ method: 'POST', url: '/auth/register', payload: { username: 'owner', email: 'o@example.com', password: 'pass' } });
    const ownerToken = (JSON.parse(r.payload as string) as any).token;
    const roomRes = await server.inject({ method: 'POST', url: '/rooms', headers: { Authorization: `Bearer ${ownerToken}` }, payload: { name: 'Priv', isPrivate: true } });
    const room = JSON.parse(roomRes.payload as string) as any;
    // attempt join without auth
    const res = await server.inject({ method: 'POST', url: '/rooms/join', payload: { code: room.code, displayName: 'intruder' } });
    expect([401, 403]).toContain(res.statusCode);
    await server.close();
  });

  it('prevents non-member authenticated user from joining private room', async () => {
    const server = Fastify();
    (global as any).__prisma__ = createPrismaMock();
    await registerRoutes(server as any);
    const r1 = await server.inject({ method: 'POST', url: '/auth/register', payload: { username: 'owner2', email: 'o2@example.com', password: 'pass' } });
    const ownerToken = (JSON.parse(r1.payload as string) as any).token;
    const roomRes = await server.inject({ method: 'POST', url: '/rooms', headers: { Authorization: `Bearer ${ownerToken}` }, payload: { name: 'Priv2', isPrivate: true } });
    const room = JSON.parse(roomRes.payload as string) as any;
    const r2 = await server.inject({ method: 'POST', url: '/auth/register', payload: { username: 'u2', email: 'u2@example.com', password: 'pass' } });
    const token2 = (JSON.parse(r2.payload as string) as any).token;
    const res = await server.inject({ method: 'POST', url: '/rooms/join', headers: { Authorization: `Bearer ${token2}` }, payload: { code: room.code, displayName: 'u2' } });
    expect(res.statusCode).toBe(403);
    await server.close();
  });
});
