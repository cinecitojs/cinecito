import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { logger } from '../lib/logger';

const CONNECT_TIMEOUT = 1000;

async function testRedisConnect(url: string, timeout = CONNECT_TIMEOUT) {
  const client = new Redis(url, { lazyConnect: true } as any);
  try {
    const connectPromise = client.connect();
    await Promise.race([
      connectPromise,
      new Promise((_, rej) => setTimeout(() => rej(new Error('connect timeout')), timeout))
    ]);
    return client;
  } catch (err) {
    try {
      await client.quit();
    } catch (e) {
      // ignore
    }
    throw err;
  }
}

export async function createRedisAdapter(url: string) {
  if (process.env.NODE_ENV === 'test') {
    logger.info('NODE_ENV=test — skipping Redis adapter');
    return undefined;
  }

  if (!url) {
    logger.info('REDIS_URL not set — skipping Redis adapter');
    return undefined;
  }

  try {
    const pubClient = await testRedisConnect(url);
    pubClient.on('error', (err: any) => logger.error({ err }, 'Redis adapter pubClient error'));
    const subClient = pubClient.duplicate();
    subClient.on('error', (err: any) => logger.error({ err }, 'Redis adapter subClient error'));
    return createAdapter(pubClient, subClient);
  } catch (err: any) {
    logger.info({ err }, 'Redis not reachable — skipping adapter');
    return undefined;
  }
}
