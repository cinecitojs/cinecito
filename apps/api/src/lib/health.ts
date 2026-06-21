import { prisma } from './db';
import { redis } from './redis';
import { logger } from './logger';

export async function checkHealth() {
  let dbOk = false;
  let redisOk = false;

  try {
    const db = await prisma.$queryRaw`SELECT 1`;
    dbOk = !!db;
  } catch (err: any) {
    logger.error({ err }, 'Database health check failed');
  }

  try {
    const r = await redis.ping();
    redisOk = r === 'PONG';
  } catch (err: any) {
    logger.error({ err }, 'Redis health check failed');
  }

  return { db: dbOk, redis: redisOk };
}
