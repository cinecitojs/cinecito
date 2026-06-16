import { PrismaClient } from '@prisma/client';

// Allow tests to inject a fake Prisma client via global.__prisma__
declare global {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	var __prisma__: any | undefined;
}

export const prisma = (global.__prisma__ as any) ?? new PrismaClient();

// In non-production keep the instance on global to avoid multiple clients in dev hot-reload
if (process.env.NODE_ENV !== 'production' && !global.__prisma__) {
	global.__prisma__ = prisma;
}
