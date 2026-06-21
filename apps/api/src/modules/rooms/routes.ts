// ============================================================
// apps/api/src/modules/rooms/routes.ts  — FASE 5
// Agrega: salas públicas (listar/buscar), descripción de sala
// REEMPLAZA el archivo existente
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/db';
import { authMiddleware } from '../../middlewares/auth';
import { isMemberOrOwner } from '../../lib/acl';
import { deleteRoomSession } from '../../services/roomSession';
import { invalidateRoomControl, normalizePermissions } from '../../lib/permissions';
import { upsertRoomMember, setSoleHost } from '../../lib/members';
import { createInvite, listInvites, revokeInvite, deleteRoomInvites } from '../../lib/inviteStore';
import { validateBody, emptyToUndefined } from '../../lib/validate';

const createInviteSchema = z.object({
  ttlHours: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().int().min(1).max(720).optional()),
  maxUses: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().int().min(1).max(1000).optional()),
});

// ¿El usuario es owner o host de la sala? (para gestionar invitaciones)
async function isRoomHostUser(roomId: string, userId: string): Promise<boolean> {
  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { ownerId: true } });
  if (!room) return false;
  if (room.ownerId === userId) return true;
  const m = await prisma.roomMember.findFirst({ where: { roomId, userId, isHost: true }, select: { id: true } });
  return !!m;
}

const createRoomSchema = z.object({
  name: z.string().trim().min(1, 'requerido').max(80, 'máximo 80 caracteres'),
  description: z.preprocess(emptyToUndefined, z.string().trim().max(300).optional()),
  isPrivate: z.boolean().optional(),               // compat
  mode: z.enum(['public', 'private', 'invite']).optional(), // nuevo: 3 modos
});

const joinRoomSchema = z.object({
  code: z.string().trim().min(1, 'requerido').max(12),
  displayName: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(30).optional()),
});

const transferHostSchema = z.object({
  roomId: z.string().min(1, 'requerido'),
  newOwnerId: z.string().min(1, 'requerido'),
});

const permKind = z.enum(['host', 'everyone']);
const permissionsSchema = z.object({
  permissions: z.object({
    addVideo: permKind.optional(),
    removeVideo: permKind.optional(),
    skip: permKind.optional(),
    pauseResume: permKind.optional(),
    seek: permKind.optional(),
  }),
});

// Helper: contar usuarios online en una sala vía Socket.IO
async function countOnline(fastify: any, roomId: string): Promise<number> {
  try {
    const io = fastify.io;
    if (!io) return 0;
    const sockets = await io.in(roomId).fetchSockets();
    const ids = sockets.map((s: any) => s.data?.userId).filter(Boolean);
    return new Set(ids).size;
  } catch {
    return 0;
  }
}

const router: FastifyPluginAsync = async (fastify) => {

  // ── POST / — Crear sala ──────────────────────────────────
  fastify.post('/', { preHandler: [authMiddleware, validateBody(createRoomSchema)] }, async (request, reply) => {
    const { name, description, isPrivate, mode } = request.body as z.infer<typeof createRoomSchema>;

    let code: string;
    let attempts = 0;
    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      attempts++;
      if (attempts > 10) return reply.status(500).send({ error: 'Could not generate unique code' });
    } while (await prisma.room.findUnique({ where: { code } }));

    const ownerId = (request as any).user?.id || null;
    const data: any = { name, description: description ?? null, code };
    if (mode) {
      // 3 modos: público / privado / solo-invitación (invite ⇒ también privada).
      data.isPrivate  = mode !== 'public';
      data.inviteOnly = mode === 'invite';
    } else {
      data.isPrivate  = isPrivate !== false; // compat: default privada
      data.inviteOnly = false;
    }
    if (ownerId) data.ownerId = ownerId;

    const room = await prisma.room.create({ data });
    reply.status(201).send(room);
  });

  // ── GET /public — Listar / buscar salas públicas ─────────
  // ?search=texto  → filtra por nombre
  // ?limit=20      → cantidad (default 20, max 50)
  fastify.get('/public', async (request, reply) => {
    const { search, limit = '20' } = request.query as any;
    const l = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    const where: any = { isPrivate: false };
    if (search?.trim()) {
      where.name = { contains: search.trim(), mode: 'insensitive' };
    }

    const rooms = await prisma.room.findMany({
      where,
      include: {
        owner: { select: { id: true, username: true, avatar: true } },
        _count: { select: { members: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: l,
    });

    // Agregar conteo de usuarios online a cada sala
    const withOnline = await Promise.all(
      rooms.map(async (room) => ({
        ...room,
        onlineCount: await countOnline(fastify, room.id),
      })),
    );

    // Ordenar: primero las que tienen gente online ahora
    withOnline.sort((a, b) => b.onlineCount - a.onlineCount);

    reply.send({ rooms: withOnline });
  });

  // ── POST /join — Unirse por código ──────────────────────
  fastify.post('/join', { preHandler: validateBody(joinRoomSchema) }, async (request, reply) => {
    const { code, displayName } = request.body as z.infer<typeof joinRoomSchema>;

    const room = await prisma.room.findUnique({ where: { code: code.toUpperCase() } });
    if (!room) return reply.status(404).send({ error: 'Room not found' });

    if (room.isPrivate) {
      await authMiddleware(request, reply);
      if ((reply as any).sent) return;
      const userId = (request as any).user?.id;
      if (room.ownerId !== userId) {
        // Permitir si ya es miembro
        const existing = await prisma.roomMember.findFirst({ where: { roomId: room.id, userId } });
        if (!existing) {
          // Solo invitación: no entra por código → debe SOLICITAR acceso al host.
          if ((room as any).inviteOnly) {
            return reply.send({ room: { id: room.id, name: room.name, inviteOnly: true }, requiresRequest: true });
          }
          return reply.status(403).send({ error: 'Sala privada — necesitás invitación' });
        }
      }
      // Alta idempotente (sin duplicar), robusta ante cliente desincronizado.
      const member = await upsertRoomMember(
        room.id, userId, displayName || (request as any).user?.username || 'User',
      );
      return reply.send({ room, member });
    }

    // Sala pública: cualquiera puede unirse (incluso invitados).
    const userId = (request as any).user?.id || null;
    const displayNameFinal = displayName || (request as any).user?.username || 'Invitado';

    // Usuarios autenticados: idempotente. Invitados anónimos (userId null): se crea uno nuevo.
    const member = userId
      ? await upsertRoomMember(room.id, userId, displayNameFinal)
      : await prisma.roomMember.create({ data: { roomId: room.id, displayName: displayNameFinal, userId: null } });
    reply.send({ room, member });
  });

  // ── GET /:id — Detalle de sala ───────────────────────────
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as any;
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, username: true, avatar: true } } },
        },
        owner: { select: { id: true, username: true, avatar: true } },
        videos: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!room) return reply.status(404).send({ error: 'Not found' });

    if (room.isPrivate) {
      await authMiddleware(request, reply);
      if ((reply as any).sent) return;
      const userId = (request as any).user?.id;
      const allowed = await isMemberOrOwner(room.id, userId);
      if (!allowed) return reply.status(403).send({ error: 'Forbidden' });
    }

    reply.send(room);
  });

  // ── GET /my — Mis salas ──────────────────────────────────
  fastify.get('/my', { preHandler: authMiddleware }, async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const rooms = await prisma.room.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        owner: { select: { id: true, username: true, avatar: true } },
        _count: { select: { members: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    reply.send({ rooms });
  });

  // ── GET /:id/online — Usuarios online ahora ──────────────
  fastify.get('/:id/online', async (request, reply) => {
    const { id } = request.params as any;
    try {
      const io = (fastify as any).io;
      if (!io) return reply.send({ onlineCount: 0, onlineUserIds: [] });
      const sockets = await io.in(id).fetchSockets();
      const ids: string[] = sockets.map((s: any) => s.data?.userId).filter(Boolean);
      const unique = [...new Set(ids)];
      reply.send({ onlineCount: unique.length, onlineUserIds: unique });
    } catch {
      reply.send({ onlineCount: 0, onlineUserIds: [] });
    }
  });

  // ── DELETE /:id — Eliminar sala ──────────────────────────
  fastify.delete('/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as any;
    const userId = (request as any).user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) return reply.status(404).send({ error: 'Not found' });
    if (room.ownerId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' });
    }

    await deleteRoomSession(id);
    deleteRoomInvites(id);
    await prisma.room.delete({ where: { id } });
    reply.send({ ok: true });
  });

  // ── POST /transfer-host ──────────────────────────────────
  fastify.post('/transfer-host', { preHandler: [authMiddleware, validateBody(transferHostSchema)] }, async (request, reply) => {
    const { roomId, newOwnerId } = request.body as z.infer<typeof transferHostSchema>;
    const userId = (request as any).user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return reply.status(404).send({ error: 'Not found' });
    if (room.ownerId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' });
    }

    // Transferir CONTROL (no ownership): consistente con el modelo de host del socket.
    const target = await prisma.user.findUnique({ where: { id: newOwnerId }, select: { username: true } });
    if (!target) return reply.status(404).send({ error: 'Target user not found' });

    await setSoleHost(roomId, newOwnerId, target.username);
    invalidateRoomControl(roomId);

    const io = (fastify as any).io;
    io?.to(roomId).emit('host-changed', { newHostId: newOwnerId, previousHostId: userId });
    reply.send({ ok: true });
  });

  // ── PATCH /:id/permissions — Actualizar permisos de la sala ──
  fastify.patch('/:id/permissions', { preHandler: [authMiddleware, validateBody(permissionsSchema)] }, async (request, reply) => {
    const { id } = request.params as any;
    const { permissions } = request.body as z.infer<typeof permissionsSchema>;
    const userId = (request as any).user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) return reply.status(404).send({ error: 'Not found' });

    const member = await prisma.roomMember.findFirst({ where: { roomId: id, userId, isHost: true } });
    if (room.ownerId !== userId && !member) return reply.status(403).send({ error: 'Forbidden' });

    const normalized = normalizePermissions(permissions);
    try {
      await prisma.room.update({ where: { id }, data: { permissions: normalized as any } });
    } catch {
      // Cliente Prisma desincronizado (columna `permissions` ausente del cliente).
      return reply.status(503).send({
        error: 'No se pudieron guardar los permisos: regenerá el cliente Prisma y reiniciá la API (npx prisma generate).',
      });
    }
    invalidateRoomControl(id);
    (fastify as any).io?.to(id).emit('permissions-updated', { permissions: normalized });
    reply.send({ ok: true, permissions: normalized });
  });

  // ── POST /:id/invites — Crear invitación (host) ──────────
  fastify.post('/:id/invites', { preHandler: [authMiddleware, validateBody(createInviteSchema)] }, async (request, reply) => {
    const { id } = request.params as any;
    const userId = (request as any).user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });
    if (!(await isRoomHostUser(id, userId))) return reply.status(403).send({ error: 'Solo el host puede invitar' });

    const { ttlHours, maxUses } = request.body as z.infer<typeof createInviteSchema>;
    const invite = createInvite(id, {
      ttlSeconds: ttlHours ? ttlHours * 3600 : null,
      maxUses: maxUses ?? null,
      createdBy: userId,
    });
    reply.status(201).send({ invite });
  });

  // ── GET /:id/invites — Listar invitaciones (host) ────────
  fastify.get('/:id/invites', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as any;
    const userId = (request as any).user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });
    if (!(await isRoomHostUser(id, userId))) return reply.status(403).send({ error: 'Forbidden' });
    reply.send({ invites: listInvites(id) });
  });

  // ── DELETE /:id/invites/:code — Revocar invitación (host) ──
  fastify.delete('/:id/invites/:code', { preHandler: authMiddleware }, async (request, reply) => {
    const { id, code } = request.params as any;
    const userId = (request as any).user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });
    if (!(await isRoomHostUser(id, userId))) return reply.status(403).send({ error: 'Forbidden' });
    const ok = revokeInvite(id, code);
    reply.send({ ok });
  });
};

export default router;
