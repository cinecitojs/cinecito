// ============================================================
// apps/api/src/modules/reports/routes.ts
// Reportes de contenido/conducta.
//   POST /reports        → crear reporte (auth opcional + rate-limit anti-spam)
//   GET  /reports        → listar (solo ADMIN — base para moderación)
//   PATCH /reports/:id    → cambiar estado (solo ADMIN)
// No implementa panel Admin completo: deja la trazabilidad y los endpoints listos.
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/db';
import { authMiddleware, optionalAuthMiddleware } from '../../middlewares/auth';
import { validateBody } from '../../lib/validate';

const REASONS = ['copyright', 'spam', 'harassment', 'impersonation', 'illegal', 'other'] as const;
const TARGETS = ['user', 'room', 'message', 'link'] as const;

const createReportSchema = z.object({
  targetType: z.enum(TARGETS),
  targetId: z.string().trim().min(1, 'requerido').max(200),
  reason: z.enum(REASONS),
  details: z.string().trim().max(2000).optional(),
  context: z.string().trim().max(2000).optional(),
});

const updateReportSchema = z.object({
  status: z.enum(['open', 'reviewing', 'actioned', 'dismissed']),
});

// Verifica rol ADMIN a partir del token ya validado por authMiddleware.
async function requireAdmin(request: any, reply: any): Promise<boolean> {
  const userId = request.user?.id;
  if (!userId) { reply.status(401).send({ error: 'Unauthorized' }); return false; }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user || user.role !== 'ADMIN') { reply.status(403).send({ error: 'Forbidden' }); return false; }
  return true;
}

const router: FastifyPluginAsync = async (fastify) => {
  // ── POST / — Crear reporte ───────────────────────────────
  fastify.post('/', {
    config: {
      rateLimit: {
        max: Number(process.env.REPORT_RATELIMIT_MAX) || 20,
        timeWindow: process.env.REPORT_RATELIMIT_WINDOW || '5 minutes',
      },
    },
    preHandler: [optionalAuthMiddleware, validateBody(createReportSchema)],
  }, async (request, reply) => {
    const { targetType, targetId, reason, details, context } = request.body as z.infer<typeof createReportSchema>;
    const reporterId = (request as any).user?.id ?? null;

    const report = await prisma.report.create({
      data: { reporterId, targetType, targetId, reason, details: details ?? null, context: context ?? null },
      select: { id: true, createdAt: true },
    });

    reply.status(201).send({ ok: true, reportId: report.id, createdAt: report.createdAt });
  });

  // ── GET / — Listar reportes (ADMIN) ──────────────────────
  fastify.get('/', { preHandler: authMiddleware }, async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const { status } = request.query as any;
    const where = status ? { status: String(status) } : {};
    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { reporter: { select: { id: true, username: true } } },
    });
    reply.send({ reports });
  });

  // ── PATCH /:id — Resolver un reporte (ADMIN) ─────────────
  fastify.patch('/:id', { preHandler: [authMiddleware, validateBody(updateReportSchema)] }, async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const { id } = request.params as any;
    const { status } = request.body as z.infer<typeof updateReportSchema>;
    const resolved = status === 'actioned' || status === 'dismissed';
    const report = await prisma.report.update({
      where: { id },
      data: { status, resolvedAt: resolved ? new Date() : null },
    });
    reply.send({ ok: true, report });
  });
};

export default router;
