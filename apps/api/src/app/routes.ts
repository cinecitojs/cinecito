import { FastifyInstance } from 'fastify';

export async function registerRoutes(fastify: FastifyInstance) {
  // Health already registered in index; add modular routes here
  fastify.register(async function (app) {
    app.get('/_ping', async () => ({ pong: true }));
  });

  // Mount auth routes
  fastify.register(await import('../modules/auth/routes').then(m => m.default), { prefix: '/auth' });
  // Socket bootstrap - register first so decorated `io` is available to routes
  fastify.register(await import('../sockets/socket').then(m => m.default));

  // Mount rooms
  fastify.register(await import('../modules/rooms/routes').then(m => m.default), { prefix: '/rooms' });

  // Mount messages
  fastify.register(await import('../modules/messages/routes').then(m => m.default), { prefix: '/messages' });

  // Uploads
  fastify.register(await import('../modules/uploads/routes').then(m => m.default), { prefix: '/uploads' });

  // Invitaciones (preview + aceptar)
  fastify.register(await import('../modules/invites/routes').then(m => m.default), { prefix: '/invites' });

  // Legal: versiones de documentos + gestión de consentimiento
  fastify.register(await import('../modules/legal/routes').then(m => m.default), { prefix: '/legal' });

  // Reportes de contenido/conducta (+ moderación base para ADMIN)
  fastify.register(await import('../modules/reports/routes').then(m => m.default), { prefix: '/reports' });

  // Apoyo voluntario (config + registro de intención de aporte)
  fastify.register(await import('../modules/support/routes').then(m => m.default), { prefix: '/support' });

  // Panel de administración (rol ADMIN)
  fastify.register(await import('../modules/admin/routes').then(m => m.default), { prefix: '/admin' });
}
