import { describe, it, expect } from 'vitest';

// Simula el cliente Prisma DESINCRONIZADO: lanza si se pide `permissions`
// (igual que el bug observado: "Invalid invocation: Unknown field permissions"),
// pero responde bien si se piden solo campos conocidos.
const mockPrisma = {
  room: {
    findUnique: async ({ select }: any) => {
      if (select?.permissions) throw new Error('Invalid invocation: Unknown field `permissions`');
      return { ownerId: 'owner-1' };
    },
  },
  roomMember: {
    findFirst: async () => null, // sin host explícito → debe caer al owner
  },
};

describe('permisos resilientes ante cliente Prisma desincronizado', () => {
  it('getRoomControl no lanza, degrada a defaults y el owner queda como controlador', async () => {
    (global as any).__prisma__ = mockPrisma;
    const { getRoomControl, isController, canDoVideoAction, invalidateRoomControl } = await import('../permissions');
    invalidateRoomControl('r1');

    const ctrl = await getRoomControl('r1');
    expect(ctrl).not.toBeNull();
    expect(ctrl!.ownerId).toBe('owner-1');
    expect(ctrl!.controllerUserId).toBe('owner-1');     // ← isHost del owner = true
    expect(ctrl!.permissions.addVideo).toBe('host');     // defaults seguros

    // El owner puede entrar y operar → arregla "no se une al chat" y "botones de video"
    expect(await isController('r1', 'owner-1')).toBe(true);
    expect(await canDoVideoAction('r1', 'owner-1', 'addVideo')).toBe(true);
    expect(await canDoVideoAction('r1', 'owner-1', 'pauseResume')).toBe(true);

    // Un extraño no controla.
    expect(await isController('r1', 'rando')).toBe(false);
    expect(await canDoVideoAction('r1', 'rando', 'addVideo')).toBe(false);
  });
});
