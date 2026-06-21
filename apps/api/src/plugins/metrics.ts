import fp from 'fastify-plugin';
import client from 'prom-client';

export default fp(async function (fastify) {
  // collect default Node metrics
  client.collectDefaultMetrics();

  const httpRequestDurationMicroseconds = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'code'],
    buckets: [0.1, 0.3, 1.5, 10]
  });

  fastify.addHook('onRequest', (request, reply, done) => {
    (request as any).startEpoch = Date.now();
    done();
  });

  fastify.addHook('onResponse', (request, reply, done) => {
    try {
      const start = (request as any).startEpoch as number || Date.now();
      const delta = (Date.now() - start) / 1000;
      httpRequestDurationMicroseconds.labels(request.method, request.routerPath || request.url, String(reply.statusCode)).observe(delta);
    } catch (err) {
      // ignore
    }
    done();
  });

  fastify.get('/metrics', async (request, reply) => {
    try {
      const requiredToken = process.env.METRICS_BEARER_TOKEN;
      if (requiredToken) {
        const auth = request.headers.authorization;
        const token = auth ? auth.replace(/^Bearer\s+/, '') : null;
        if (!token || token !== requiredToken) return reply.status(401).send('Unauthorized');
      }
      const metrics = await client.register.metrics();
      reply.header('Content-Type', client.register.contentType).send(metrics);
    } catch (err) {
      reply.status(500).send('Error collecting metrics');
    }
  });
});
