import fp from 'fastify-plugin';
import * as Sentry from '@sentry/node';

export default fp(async function (fastify) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    fastify.log.info('Sentry DSN not provided; Sentry disabled');
    return;
  }

  Sentry.init({ dsn, environment: process.env.NODE_ENV || 'development' });

  fastify.addHook('onError', async (request, reply, error) => {
    try {
      Sentry.captureException(error);
      await Sentry.flush(2000);
    } catch (err) {
      fastify.log.error('failed to send to Sentry', err as any);
    }
  });
});
