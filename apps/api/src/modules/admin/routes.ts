// ============================================================
// apps/api/src/modules/admin/routes.ts
// Panel de administración (rol ADMIN). Reutiliza lo existente (reportes en /reports,
// borrar sala en DELETE /rooms/:id). Endpoints:
//   GET    /admin/overview              → métricas
//   GET    /admin/users?search=         → listar usuarios
//   POST   /admin/users/:id/status      → moderar (active|suspended|blocked)
//   POST   /admin/users/:id/grant       → conceder tier de supporter (prueba/recompensa)
//   DELETE /admin/users/:id             → eliminar usuario (y sus salas)
//   GET    /admin/rooms?search=         → listar salas
// Reglas: no actuar sobre uno mismo ni sobre otros ADMIN. Todo trazable.
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/db';
import { authMiddleware } from '../../middlewares/auth';
import { requireAdmin } from '../../middlewares/requireAdmin';
import { validateBody } from '../../lib/validate';
import { deleteRoomSession } from '../../services/roomSession';
import { deleteRoomInvites } from '../../lib/inviteStore';
import { grantSupporter, type SupporterTier } from '../../lib/supporter';
import { moderationSnapshot } from '../../lib/roomModerationStore';

const adminPre = [authMiddleware, requireAdmin];

const statusSchema = z.object({
  status: z.enum(['active', 'suspended', 'blocked']),
  reason: z.string().trim().max(300).optional(),
  days: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().int().min(1).max(3650).optional()),
});

const grantSchema = z.object({ tier: z.enum(['amigo', 'colaborador', 'patrocinador']) });

async function cleanupOwnedRooms(userId: string) {
  const rooms = await prisma.room.findMany({ where: { ownerId: userId }, select: { id: true } });
  for (const r of rooms) {
    try { await deleteRoomSession(r.id); } catch { /* best-effort */ }
    try { deleteRoomInvites(r.id); } catch { /* best-effort */ }
  }
  await prisma.room.deleteMany({ where: { ownerId: userId } });
}

const router: FastifyPluginAsync = async (fastify) => {
  // ── GET /overview ────────────────────────────────────────
  fastify.get('/overview', { preHandler: adminPre }, async (_request, reply) => {
    const [users, guests, rooms, openReports, supporters, suspended] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isGuest: true } }),
      prisma.room.count(),
      prisma.report.count({ where: { status: 'open' } }),
      prisma.user.count({ where: { supporterTier: { not: null } } }),
      prisma.user.count({ where: { status: { in: ['suspended', 'blocked'] } } }),
    ]);
    reply.send({ users, guests, rooms, openReports, supporters, suspended });
  });

  // ── GET /users ───────────────────────────────────────────
  fastify.get('/users', { preHandler: adminPre }, async (request, reply) => {
    const { search, limit = '50' } = request.query as any;
    const take = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const where: any = {};
    if (search?.trim()) {
      where.OR = [
        { username: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }
    const users = await prisma.user.findMany({
      where, take, orderBy: { createdAt: 'desc' },
      select: {
        id: true, username: true, email: true, role: true, status: true, suspendedUntil: true,
        isGuest: true, supporterTier: true, createdAt: true,
        _count: { select: { rooms: true } },
      },
    });
    reply.send({ users });
  });

  // ── POST /users/:id/status — moderar ─────────────────────
  fastify.post('/users/:id/status', { preHandler: [...adminPre, validateBody(statusSchema)] }, async (request, reply) => {
    const { id } = request.params as any;
    const meId = (request as any).user.id;
    if (id === meId) return reply.status(400).send({ error: 'No podés moderar tu propia cuenta' });

    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!target) return reply.status(404).send({ error: 'Usuario no encontrado' });
    if (target.role === 'ADMIN') return reply.status(403).send({ error: 'No se puede moderar a otro administrador' });

    const { status, reason, days } = request.body as z.infer<typeof statusSchema>;
    const suspendedUntil = status === 'suspended' && days ? new Date(Date.now() + days * 86_400_000) : null;

    const user = await prisma.user.update({
      where: { id },
      data: { status, statusReason: reason ?? null, suspendedUntil },
      select: { id: true, username: true, status: true, statusReason: true, suspendedUntil: true },
    });
    request.log.info({ admin: meId, target: id, status, reason }, 'admin: cambio de estado de cuenta');
    reply.send({ user });
  });

  // ── POST /users/:id/grant — conceder supporter ───────────
  fastify.post('/users/:id/grant', { preHandler: [...adminPre, validateBody(grantSchema)] }, async (request, reply) => {
    const { id } = request.params as any;
    const { tier } = request.body as z.infer<typeof grantSchema>;
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!target) return reply.status(404).send({ error: 'Usuario no encontrado' });

    await prisma.contribution.create({
      data: { userId: id, tier, amount: 0, provider: 'admin', providerRef: `admin_${Date.now()}`, status: 'confirmed', confirmedAt: new Date() },
    });
    await grantSupporter(id, tier as SupporterTier);
    request.log.info({ admin: (request as any).user.id, target: id, tier }, 'admin: supporter concedido');
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, username: true, supporterTier: true } });
    reply.send({ user });
  });

  // ── DELETE /users/:id ────────────────────────────────────
  fastify.delete('/users/:id', { preHandler: adminPre }, async (request, reply) => {
    const { id } = request.params as any;
    const meId = (request as any).user.id;
    if (id === meId) return reply.status(400).send({ error: 'No podés eliminar tu propia cuenta desde acá' });

    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!target) return reply.status(404).send({ error: 'Usuario no encontrado' });
    if (target.role === 'ADMIN') return reply.status(403).send({ error: 'No se puede eliminar a otro administrador' });

    await cleanupOwnedRooms(id);
    await prisma.user.delete({ where: { id } });
    request.log.info({ admin: meId, target: id }, 'admin: usuario eliminado');
    reply.send({ ok: true });
  });

  // ── GET /rooms ───────────────────────────────────────────
  fastify.get('/rooms', { preHandler: adminPre }, async (request, reply) => {
    const { search, limit = '50' } = request.query as any;
    const take = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const where: any = {};
    if (search?.trim()) where.name = { contains: search.trim(), mode: 'insensitive' };
    const rooms = await prisma.room.findMany({
      where, take, orderBy: { updatedAt: 'desc' },
      select: {
        id: true, name: true, code: true, isPrivate: true, inviteOnly: true,
        currentVideoId: true, updatedAt: true,
        owner: { select: { username: true } },
        _count: { select: { members: true } },
      },
    });
    reply.send({ rooms });
  });

  // ── GET /stats — métricas + series de 7 días (sparklines) ──
  fastify.get('/stats', { preHandler: adminPre }, async (_request, reply) => {
    const since = new Date(Date.now() - 7 * 86_400_000);
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const days: number[] = [];
    for (let i = 6; i >= 0; i--) days.push(start.getTime() - i * 86_400_000);
    const dayIdx = (d: Date) => {
      const x = new Date(d); x.setHours(0, 0, 0, 0);
      return days.indexOf(x.getTime());
    };
    const bucket = (rows: { createdAt: Date }[]) => {
      const c = days.map(() => 0);
      for (const r of rows) { const i = dayIdx(r.createdAt); if (i >= 0) c[i]++; }
      return c;
    };
    const [users, guests, rooms, openReports, supporters, suspended, messages, newUsers, newRooms, recentMsgs] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isGuest: true } }),
      prisma.room.count(),
      prisma.report.count({ where: { status: 'open' } }),
      prisma.user.count({ where: { supporterTier: { not: null } } }),
      prisma.user.count({ where: { status: { in: ['suspended', 'blocked'] } } }),
      prisma.message.count(),
      prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.room.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.message.count({ where: { createdAt: { gte: since } } }),
    ]);
    reply.send({
      totals: { users, guests, rooms, openReports, supporters, suspended, messages },
      series: { users: bucket(newUsers), rooms: bucket(newRooms) },
      last7: { users: newUsers.length, rooms: newRooms.length, messages: recentMsgs },
      days,
    });
  });

  // ── GET /live — instantánea de conexiones y salas activas ──
  fastify.get('/live', { preHandler: adminPre }, async (_request, reply) => {
    const io = (fastify as any).io;
    let sockets: any[] = [];
    try { sockets = io ? await io.fetchSockets() : []; } catch { sockets = []; }
    const userIds = new Set<string>();
    let guests = 0;
    const roomCount = new Map<string, number>();
    for (const s of sockets) {
      const uid = s.data?.userId;
      if (uid) userIds.add(uid); else guests++;
      const rid = s.data?.currentRoom;
      if (rid) roomCount.set(rid, (roomCount.get(rid) || 0) + 1);
    }
    const roomIds = [...roomCount.keys()];
    const rooms = roomIds.length
      ? await prisma.room.findMany({ where: { id: { in: roomIds } }, select: { id: true, name: true, code: true, currentVideoId: true } })
      : [];
    const activeRooms = rooms
      .map((r) => ({ id: r.id, name: r.name, code: r.code, playing: !!r.currentVideoId, present: roomCount.get(r.id) || 0 }))
      .sort((a, b) => b.present - a.present);
    reply.send({
      connections: sockets.length,
      users: userIds.size,
      guests,
      activeRooms,
      moderation: moderationSnapshot(),
    });
  });

  // ── GET /videos — enlaces pegados (revisión) ──────────────
  fastify.get('/videos', { preHandler: adminPre }, async (request, reply) => {
    const { search, limit = '60' } = request.query as any;
    const take = Math.min(200, Math.max(1, parseInt(limit, 10) || 60));
    const where: any = {};
    if (search?.trim()) {
      where.OR = [
        { url: { contains: search.trim(), mode: 'insensitive' } },
        { title: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }
    const videos = await prisma.videoMeta.findMany({
      where, take, orderBy: { createdAt: 'desc' },
      select: {
        id: true, url: true, title: true, source: true, createdAt: true, roomId: true,
        room: { select: { name: true, code: true } },
      },
    });
    reply.send({ videos });
  });

  // ── DELETE /videos/:id — quitar un enlace ─────────────────
  fastify.delete('/videos/:id', { preHandler: adminPre }, async (request, reply) => {
    const { id } = request.params as any;
    await prisma.videoMeta.deleteMany({ where: { id } });
    request.log.info({ admin: (request as any).user.id, video: id }, 'admin: enlace eliminado');
    reply.send({ ok: true });
  });
};

export default router;
