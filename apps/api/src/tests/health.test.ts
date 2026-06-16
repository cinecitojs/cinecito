import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { registerRoutes } from '../app/routes';

describe('health', () => {
  it('responds to /_ping', async () => {
    const server = Fastify();
    await registerRoutes(server);
    const res = await server.inject({ method: 'GET', url: '/_ping' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ pong: true });
  });
});
