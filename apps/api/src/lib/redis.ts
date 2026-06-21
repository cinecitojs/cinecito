import Redis from 'ioredis';
import { logger } from './logger';

type SafeRedis = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<string | null>;
  setex: (key: string, seconds: number, value: string) => Promise<string | null>;
  del: (key: string) => Promise<number>;
  sadd: (key: string, member: string) => Promise<number>;
  srem: (key: string, member: string) => Promise<number>;
  smembers: (key: string) => Promise<string[]>;
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<number>;
  pexpire: (key: string, ms: number) => Promise<number>;
  ping: () => Promise<string | null>;
  quit: () => Promise<void>;
  /** true si hay una conexión Redis real activa (no el stub en memoria). */
  live: boolean;
};

// Stub que no hace nada (para test o cuando no hay Redis)
function stubRedis(): SafeRedis {
  return {
    get:      async () => null,
    set:      async () => null,
    setex:    async () => null,
    del:      async () => 0,
    sadd:     async () => 0,
    srem:     async () => 0,
    smembers: async () => [],
    incr:     async () => 0,
    expire:   async () => 0,
    pexpire:  async () => 0,
    ping:     async () => null,
    quit:     async () => {},
    live:     false,
  };
}

function createSafeRedis(url?: string): SafeRedis {
  // Sin Redis en modo test
  if (process.env.NODE_ENV === 'test') {
    logger.info('NODE_ENV=test — usando stub Redis');
    return stubRedis();
  }

  // Sin URL → stub (la app funciona con estado en memoria)
  if (!url) {
    logger.info('REDIS_URL no configurado — usando stub Redis (estado en memoria)');
    return stubRedis();
  }

  // Con URL: conectar pero con reintentos limitados para no spamear errores
  let warned = false;
  const client = new Redis(url, {
    // Reintentar como máximo 3 veces, luego rendirse en silencio
    retryStrategy(times: number) {
      if (times > 3) {
        if (!warned) {
          logger.warn('Redis no accesible tras 3 intentos — continuando sin Redis');
          warned = true;
        }
        return null; // null = dejar de reintentar
      }
      return Math.min(times * 200, 1000);
    },
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: false,
  });

  const safeCall = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  };

  const safe: SafeRedis = {
    get:      (k)        => safeCall(() => client.get(k), null),
    set:      (k, v)     => safeCall(() => client.set(k, v), null),
    setex:    (k, s, v)  => safeCall(() => client.setex(k, s, v), null),
    del:      (k)        => safeCall(() => client.del(k), 0),
    sadd:     (k, m)     => safeCall(() => client.sadd(k, m), 0),
    srem:     (k, m)     => safeCall(() => client.srem(k, m), 0),
    smembers: (k)        => safeCall(() => client.smembers(k), [] as string[]),
    incr:     (k)        => safeCall(() => client.incr(k), 0),
    expire:   (k, s)     => safeCall(() => client.expire(k, s), 0),
    pexpire:  (k, ms)    => safeCall(() => client.pexpire(k, ms), 0),
    ping:     ()         => safeCall(() => client.ping(), null),
    quit:     async ()   => { try { await client.quit(); } catch { /* ignorar */ } },
    live:     false,
  };

  client.on('ready', () => { safe.live = true; });
  client.on('end',   () => { safe.live = false; });

  // Silenciar el spam de errores de conexión: solo loguear una vez
  client.on('error', (err: any) => {
    safe.live = false;
    if (!warned) {
      logger.warn({ code: err?.code }, 'Redis client error — continuando sin Redis');
      warned = true;
    }
  });

  return safe;
}

export const redis = createSafeRedis(process.env.REDIS_URL as string | undefined);
