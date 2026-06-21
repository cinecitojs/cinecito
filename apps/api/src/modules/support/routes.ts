// ============================================================
// apps/api/src/modules/support/routes.ts
// Apoyo voluntario + recompensas COSMÉTICAS. NO cobra: registra contribuciones y, al
// CONFIRMARSE el pago vía webhook del proveedor (Stripe / Mercado Pago), concede las
// recompensas. Endpoints:
//   GET   /support/config              → moneda, proveedores, resumen
//   POST  /support/contributions       → registra intención (auth opcional)
//   GET   /support/me                  → estado de supporter del usuario (auth)
//   PATCH /support/me                  → cambiar tema/anonimato (auth, validado)
//   POST  /support/dev/grant           → conceder tier en DESARROLLO (guardado)
//   POST  /support/webhook/stripe      → confirma pago (verifica firma)
//   POST  /support/webhook/mercadopago → confirma pago (verifica firma)
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../../lib/db';
import { authMiddleware, optionalAuthMiddleware } from '../../middlewares/auth';
import { validateBody } from '../../lib/validate';
import {
  grantSupporter, confirmContribution, unlockedThemes, isTier, rankOf, type SupporterTier,
} from '../../lib/supporter';

const contributeSchema = z.object({
  tier: z.enum(['amigo', 'colaborador', 'patrocinador']),
  amount: z.number().min(1, 'monto mínimo 1').max(100000, 'monto demasiado alto'),
  frequency: z.enum(['once', 'monthly']),
  message: z.string().trim().max(500).optional(),
  recognition: z.boolean().optional(),
});

const updateMeSchema = z.object({
  theme: z.string().max(40).nullable().optional(),   // tema de sala (debe estar desbloqueado)
  anonymous: z.boolean().optional(),
  badge: z.string().max(40).nullable().optional(),
});

const devGrantSchema = z.object({
  tier: z.enum(['amigo', 'colaborador', 'patrocinador']),
});

function checkoutUrlFor(tier: string): string | null {
  const perTier = process.env[`SUPPORT_CHECKOUT_URL_${tier.toUpperCase()}`];
  const base = process.env.SUPPORT_CHECKOUT_URL;
  return (perTier || base || '').trim() || null;
}

function providersAvailable() {
  return {
    kofi: !!process.env.KOFI_VERIFICATION_TOKEN,
    stripe: !!process.env.STRIPE_WEBHOOK_SECRET,
    mercadopago: !!process.env.MP_WEBHOOK_SECRET,
    checkout: !!(process.env.SUPPORT_CHECKOUT_URL
      || process.env.SUPPORT_CHECKOUT_URL_AMIGO
      || process.env.SUPPORT_CHECKOUT_URL_COLABORADOR
      || process.env.SUPPORT_CHECKOUT_URL_PATROCINADOR),
  };
}

// Ko-fi no envía nuestro tier: lo inferimos del nombre de membresía o del monto.
function kofiTier(amount: unknown, tierName?: string): SupporterTier {
  const t = (tierName || '').toLowerCase();
  if (t.includes('patrocin') || t.includes('sponsor')) return 'patrocinador';
  if (t.includes('colabor')) return 'colaborador';
  if (t.includes('amigo') || t.includes('friend')) return 'amigo';
  const a = Number(amount) || 0;
  if (a >= 20) return 'patrocinador';
  if (a >= 8) return 'colaborador';
  return 'amigo';
}

// Forma pública del estado de supporter (sin datos sensibles).
function supporterView(user: any) {
  const tier = user.supporterTier ?? null;
  return {
    tier,
    since: user.supporterSince ?? null,
    badge: user.supporterBadge ?? null,
    theme: user.supporterTheme ?? null,
    anonymous: !!user.supporterAnonymous,
    unlockedThemes: unlockedThemes(tier),
  };
}

const router: FastifyPluginAsync = async (fastify) => {
  // Parser que conserva el body crudo (necesario para verificar firmas de webhook).
  // Encapsulado: solo afecta a las rutas de este plugin.
  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    (req as any).rawBody = typeof body === 'string' ? body : (body as Buffer).toString('utf8');
    try { done(null, body ? JSON.parse(body as string) : {}); }
    catch (err) { done(err as Error, undefined); }
  });
  // Ko-fi envía application/x-www-form-urlencoded con un campo `data` (JSON).
  fastify.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, (req, body, done) => {
    (req as any).rawBody = typeof body === 'string' ? body : (body as Buffer).toString('utf8');
    try {
      const params = new URLSearchParams((req as any).rawBody);
      const obj: Record<string, string> = {};
      params.forEach((v, k) => { obj[k] = v; });
      done(null, obj);
    } catch (err) { done(err as Error, undefined); }
  });

  // ── GET /config ──────────────────────────────────────────
  fastify.get('/config', async (_request, reply) => {
    const confirmed = await prisma.contribution.count({ where: { status: 'confirmed' } });
    reply.send({
      currency: { symbol: '$', code: 'USD' },
      providers: providersAvailable(),
      checkoutConfigured: providersAvailable().checkout,
      summary: { confirmed },
    });
  });

  // ── GET /wall — muro de agradecimientos (público) ───────
  // Supporters que NO eligieron anonimato, ordenados por nivel (patrocinador primero).
  fastify.get('/wall', async (_request, reply) => {
    const users = await prisma.user.findMany({
      where: { supporterTier: { not: null }, supporterAnonymous: false },
      select: { username: true, avatar: true, supporterTier: true, supporterSince: true },
      take: 200,
    });
    const wall = users
      .map((u) => ({ username: u.username, avatar: u.avatar, tier: u.supporterTier, since: u.supporterSince }))
      .sort((a, b) => rankOf(b.tier) - rankOf(a.tier) || (+new Date(a.since ?? 0) - +new Date(b.since ?? 0)));
    reply.send({ wall, total: wall.length });
  });

  // ── POST /contributions — registrar intención ────────────
  fastify.post('/contributions', {
    config: { rateLimit: { max: Number(process.env.SUPPORT_RATELIMIT_MAX) || 15, timeWindow: process.env.SUPPORT_RATELIMIT_WINDOW || '5 minutes' } },
    preHandler: [optionalAuthMiddleware, validateBody(contributeSchema)],
  }, async (request, reply) => {
    const { tier, amount, frequency, message, recognition } = request.body as z.infer<typeof contributeSchema>;
    const userId = (request as any).user?.id ?? null;

    const contribution = await prisma.contribution.create({
      data: {
        userId, tier, amount: Math.round(amount), frequency,
        message: message ?? null, anonymous: recognition === false ? true : false,
        status: 'pending',
      },
      select: { id: true, createdAt: true },
    });

    const checkoutUrl = checkoutUrlFor(tier);
    // Honesto: si no hay proveedor, queda como intención (sin cobro). Las recompensas
    // se conceden recién al confirmar el pago por webhook.
    reply.status(201).send({ ok: true, id: contribution.id, checkoutUrl, pending: !checkoutUrl });
  });

  // ── GET /me — estado de supporter ────────────────────────
  fastify.get('/me', { preHandler: authMiddleware }, async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return reply.status(404).send({ error: 'User not found' });
    reply.send({ supporter: supporterView(user) });
  });

  // ── PATCH /me — preferencias cosméticas (tema, anonimato) ─
  fastify.patch('/me', { preHandler: [authMiddleware, validateBody(updateMeSchema)] }, async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });
    const { theme, anonymous, badge } = request.body as z.infer<typeof updateMeSchema>;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return reply.status(404).send({ error: 'User not found' });

    const data: any = {};
    if (theme !== undefined) {
      // Validar que el tema esté desbloqueado por el tier (o sea limpiar = null/default).
      const allowed = unlockedThemes(user.supporterTier);
      if (theme && theme !== 'default' && !allowed.includes(theme)) {
        return reply.status(403).send({ error: 'Ese tema no está desbloqueado para tu nivel de apoyo' });
      }
      data.supporterTheme = theme && theme !== 'default' ? theme : null;
    }
    if (anonymous !== undefined) data.supporterAnonymous = anonymous;
    if (badge !== undefined) {
      // El "estilo" (insignia/marco/fondo a mostrar) puede ser el de CUALQUIER tier ya
      // desbloqueado: rank(badge) ≤ rank(tier actual). Así un patrocinador puede lucir
      // el look de amigo o colaborador si lo prefiere. null = volver al tier actual.
      if (badge) {
        if (!isTier(badge) || rankOf(badge) > rankOf(user.supporterTier)) {
          return reply.status(403).send({ error: 'Ese estilo no está disponible para tu nivel' });
        }
      }
      data.supporterBadge = badge || null;
    }

    const updated = await prisma.user.update({ where: { id: userId }, data });
    reply.send({ supporter: supporterView(updated) });
  });

  // ── POST /dev/grant — conceder tier en DESARROLLO ────────
  // Guardado: solo si SUPPORT_DEV_GRANT=true o el usuario es ADMIN. NUNCA concede en
  // producción salvo que se habilite explícitamente. Útil para probar recompensas.
  fastify.post('/dev/grant', { preHandler: [authMiddleware, validateBody(devGrantSchema)] }, async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });
    const devEnabled = process.env.SUPPORT_DEV_GRANT === 'true';
    if (!devEnabled) {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (!u || u.role !== 'ADMIN') return reply.status(403).send({ error: 'No habilitado' });
    }
    const { tier } = request.body as z.infer<typeof devGrantSchema>;
    await prisma.contribution.create({
      data: { userId, tier, amount: 0, provider: 'dev', providerRef: `dev_${Date.now()}`, status: 'confirmed', confirmedAt: new Date() },
    });
    await grantSupporter(userId, tier as SupporterTier);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    reply.send({ supporter: supporterView(user) });
  });

  // ── Webhook: Stripe ──────────────────────────────────────
  fastify.post('/webhook/stripe', async (request, reply) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return reply.status(503).send({ error: 'Stripe no configurado' });
    const sig = request.headers['stripe-signature'] as string | undefined;
    const raw = (request as any).rawBody as string | undefined;
    if (!sig || !raw || !verifyStripe(raw, sig, secret)) {
      return reply.status(400).send({ error: 'Firma inválida' });
    }
    const event = request.body as any;
    // Pago completado: conceder según metadata (definida al crear el checkout).
    if (event?.type === 'checkout.session.completed' || event?.type === 'payment_intent.succeeded') {
      const obj = event.data?.object ?? {};
      const userId = obj.client_reference_id || obj.metadata?.userId || null;
      const tier = obj.metadata?.tier || null;
      const providerRef = obj.id;
      const amount = typeof obj.amount_total === 'number' ? Math.round(obj.amount_total / 100) : undefined;
      if (providerRef) await confirmContribution({ provider: 'stripe', providerRef, userId, tier, amount });
    }
    reply.send({ received: true });
  });

  // ── Webhook: Ko-fi ───────────────────────────────────────
  // Ko-fi POST (form-urlencoded) con `data` (JSON) que incluye verification_token,
  // message_id, email, amount, tier_name… Verificamos el token, mapeamos email→usuario
  // y concedemos el tier (idempotente por message_id). Las recompensas se otorgan acá,
  // solo tras la confirmación real del apoyo.
  fastify.post('/webhook/kofi', async (request, reply) => {
    const token = process.env.KOFI_VERIFICATION_TOKEN;
    if (!token) return reply.status(503).send({ error: 'Ko-fi no configurado' });
    let payload: any;
    try { payload = JSON.parse((request.body as any)?.data ?? '{}'); }
    catch { return reply.status(400).send({ error: 'Payload inválido' }); }

    if (payload.verification_token !== token) return reply.status(401).send({ error: 'Token inválido' });

    const providerRef = String(payload.message_id ?? payload.kofi_transaction_id ?? '');
    if (!providerRef) return reply.send({ received: true });

    // Mapear por email al usuario de Cinecito (si usó el mismo correo).
    let userId: string | null = null;
    if (payload.email) {
      const u = await prisma.user.findFirst({ where: { email: String(payload.email) }, select: { id: true } });
      userId = u?.id ?? null;
    }
    const tier = kofiTier(payload.amount, payload.tier_name);
    const amount = Math.round(Number(payload.amount) || 0);

    await confirmContribution({ provider: 'kofi', providerRef, userId, tier, amount });
    // Si el anonimato venía marcado: respetar is_public=false como anónimo.
    if (userId && payload.is_public === false) {
      try { await prisma.user.update({ where: { id: userId }, data: { supporterAnonymous: true } }); } catch { /* */ }
    }
    reply.send({ received: true });
  });

  // ── Webhook: Mercado Pago ────────────────────────────────
  fastify.post('/webhook/mercadopago', async (request, reply) => {
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) return reply.status(503).send({ error: 'Mercado Pago no configurado' });
    if (!verifyMercadoPago(request, secret)) return reply.status(400).send({ error: 'Firma inválida' });
    const body = request.body as any;
    // MP notifica un id de pago; en producción hay que CONSULTAR el pago a la API de MP
    // para obtener estado y metadata (userId, tier). Aquí confirmamos con lo recibido.
    const providerRef = String(body?.data?.id ?? (request.query as any)?.['data.id'] ?? '');
    const userId = body?.metadata?.userId || null;
    const tier = body?.metadata?.tier || null;
    if (providerRef && (body?.action === 'payment.updated' || body?.type === 'payment')) {
      await confirmContribution({ provider: 'mercadopago', providerRef, userId, tier });
    }
    reply.send({ received: true });
  });
};

// ── Verificación de firmas ─────────────────────────────────
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a); const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function verifyStripe(raw: string, sigHeader: string, secret: string): boolean {
  try {
    const parts: Record<string, string> = {};
    for (const kv of sigHeader.split(',')) { const [k, v] = kv.split('='); if (k && v) parts[k.trim()] = v.trim(); }
    const t = parts['t']; const v1 = parts['v1'];
    if (!t || !v1) return false;
    const expected = crypto.createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex');
    return safeEqual(expected, v1);
  } catch { return false; }
}

function verifyMercadoPago(request: any, secret: string): boolean {
  try {
    const sig = request.headers['x-signature'] as string | undefined;
    const reqId = request.headers['x-request-id'] as string | undefined;
    if (!sig) return false;
    const parts: Record<string, string> = {};
    for (const kv of sig.split(',')) { const [k, v] = kv.split('='); if (k && v) parts[k.trim()] = v.trim(); }
    const ts = parts['ts']; const v1 = parts['v1'];
    const dataId = String(request.query?.['data.id'] ?? request.body?.data?.id ?? '');
    if (!ts || !v1) return false;
    const manifest = `id:${dataId};request-id:${reqId ?? ''};ts:${ts};`;
    const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
    return safeEqual(expected, v1);
  } catch { return false; }
}

export default router;
