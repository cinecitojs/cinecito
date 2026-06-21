// ============================================================
// apps/api/src/modules/legal/routes.ts
// Versiones de documentos + gestión de consentimiento del usuario.
//   GET  /legal/versions   → versiones vigentes (público)
//   GET  /legal/consents   → consentimientos del usuario (auth)
//   POST /legal/consents   → registrar/actualizar un consentimiento (auth)
// La evidencia es append-only: cada POST agrega una fila; el "estado actual" de un
// tipo es su fila más reciente.
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/db';
import { authMiddleware } from '../../middlewares/auth';
import { validateBody } from '../../lib/validate';
import { LEGAL_VERSIONS, LEGAL_EFFECTIVE_DATE, isLegalDocType } from '../../lib/legal';

const consentSchema = z.object({
  docType: z.string().refine(isLegalDocType, 'tipo de documento inválido'),
  accepted: z.boolean(),
  // Categorías de cookies elegidas (informativo, para el banner): { preferences, analytics }
  detail: z.record(z.boolean()).optional(),
});

const router: FastifyPluginAsync = async (fastify) => {
  // ── GET /versions — público ──────────────────────────────
  fastify.get('/versions', async (_request, reply) => {
    reply.send({ versions: LEGAL_VERSIONS, effectiveDate: LEGAL_EFFECTIVE_DATE });
  });

  // ── GET /consents — mis consentimientos (auth) ───────────
  fastify.get('/consents', { preHandler: authMiddleware }, async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const rows = await prisma.legalAcceptance.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, docType: true, docVersion: true, accepted: true, createdAt: true },
    });

    // Estado actual por tipo = fila más reciente de ese tipo.
    const current: Record<string, { accepted: boolean; version: string; at: Date }> = {};
    for (const r of rows) {
      if (!current[r.docType]) current[r.docType] = { accepted: r.accepted, version: r.docVersion, at: r.createdAt };
    }

    reply.send({ history: rows, current, versions: LEGAL_VERSIONS });
  });

  // ── POST /consents — registrar un consentimiento (auth) ──
  fastify.post('/consents', { preHandler: [authMiddleware, validateBody(consentSchema)] }, async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const { docType, accepted, detail } = request.body as z.infer<typeof consentSchema>;
    const ip = request.ip;
    const userAgent = (request.headers['user-agent'] || '').slice(0, 400);

    const row = await prisma.legalAcceptance.create({
      data: {
        userId,
        docType,
        docVersion: (LEGAL_VERSIONS as any)[docType],
        accepted,
        ip,
        userAgent: detail ? `${userAgent} :: ${JSON.stringify(detail)}`.slice(0, 400) : userAgent,
      },
      select: { id: true, docType: true, docVersion: true, accepted: true, createdAt: true },
    });

    reply.status(201).send({ consent: row });
  });
};

export default router;
