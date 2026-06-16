import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { registerRoutes } from '../app/routes';
import { createPrismaMock } from './prismaMock';

describe('POST /rooms (auth/no-auth)', () => {
  it('returns 401 when no Authorization header', async () => {
    const server = Fastify();
    (global as any).__prisma__ = createPrismaMock();
    await registerRoutes(server as any);
    const res = await server.inject({ method: 'POST', url: '/rooms', payload: { name: 'Room X' } });
    expect(res.statusCode).toBe(401);
    await server.close();
  });

  it('creates room when authenticated', async () => {
    const server = Fastify();
    (global as any).__prisma__ = createPrismaMock();
    await registerRoutes(server as any);
    const r = await server.inject({ method: 'POST', url: '/auth/register', payload: { username: 't', email: 't@example.com', password: 'password' } });
    const body = JSON.parse(r.payload as string) as any;
    const token = body.token as string;
    const res = await server.inject({
      method: 'POST',
      url: '/rooms',
      headers: { Authorization: `Bearer ${token}` },
      payload: { name: 'Private room', isPrivate: false }
    });
    expect([200, 201]).toContain(res.statusCode);
    const created = JSON.parse(res.payload as string) as any;
    expect(created).toHaveProperty('id');
    expect(created.name).toBe('Private room');
    await server.close();
  });
});
