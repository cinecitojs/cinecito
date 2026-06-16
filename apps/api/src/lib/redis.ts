import Redis from 'ioredis';
import { logger } from './logger';

type SafeRedis = {
	get: (key: string) => Promise<string | null>;
	set: (key: string, value: string) => Promise<string | null>;
	sadd: (key: string, member: string) => Promise<number>;
	srem: (key: string, member: string) => Promise<number>;
	ping: () => Promise<string | null>;
	quit: () => Promise<void>;
};

function createSafeRedis(url?: string): SafeRedis {
	if (process.env.NODE_ENV === 'test') {
		logger.info('NODE_ENV=test — using stub Redis client');
		return {
			get: async () => null,
			set: async () => null,
			sadd: async () => 0,
			srem: async () => 0,
			ping: async () => null,
			quit: async () => {}
		};
	}

	if (!url) {
		logger.info('REDIS_URL not set — using fallback stub Redis client');
		return {
			get: async () => null,
			set: async () => null,
			sadd: async () => 0,
			srem: async () => 0,
			ping: async () => null,
			quit: async () => {}
		};
	}

	const client = new Redis(url);
	client.on('error', (err: any) => {
		logger.error({ err }, 'Redis client error');
	});

	return {
		get: async (k: string) => {
			try {
				return await client.get(k);
			} catch (err: any) {
				logger.error({ err, key: k }, 'Redis GET failed');
				return null;
			}
		},
		set: async (k: string, v: string) => {
			try {
				return await client.set(k, v);
			} catch (err: any) {
				logger.error({ err, key: k }, 'Redis SET failed');
				return null;
			}
		},
		sadd: async (k: string, m: string) => {
			try {
				return await client.sadd(k, m);
			} catch (err: any) {
				logger.error({ err, key: k }, 'Redis SADD failed');
				return 0;
			}
		},
		srem: async (k: string, m: string) => {
			try {
				return await client.srem(k, m);
			} catch (err: any) {
				logger.error({ err, key: k }, 'Redis SREM failed');
				return 0;
			}
		},
		ping: async () => {
			try {
				return await client.ping();
			} catch (err: any) {
				logger.error({ err }, 'Redis PING failed');
				return null;
			}
		},
		quit: async () => {
			try {
				await client.quit();
			} catch (err: any) {
				logger.error({ err }, 'Redis QUIT failed');
			}
		}
	};
}

export const redis = createSafeRedis(process.env.REDIS_URL as string | undefined);
