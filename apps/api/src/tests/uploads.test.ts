import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { registerRoutes } from '../app/routes';

describe('uploads', () => {
  it('init requires auth', async () => {
    const server = Fastify();
    await registerRoutes(server);
    const res = await server.inject({
      method: 'POST',
      url: '/uploads/init',
      payload: { filename: 'video.mp4', contentType: 'video/mp4' },
    });
    expect([401, 403]).toContain(res.statusCode);
  });
});
