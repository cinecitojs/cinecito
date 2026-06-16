import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { registerRoutes } from '../app/routes';

describe('auth', () => {
  it('register endpoint exists', async () => {
    const server = Fastify();
    await registerRoutes(server);
    const res = await server.inject({ method: 'POST', url: '/auth/register', payload: { username: 't', email: 't@example.com', password: 'password' } });
    expect([200, 201, 400, 500]).toContain(res.statusCode);
  });
});
