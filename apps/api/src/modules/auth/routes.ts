// ============================================================
// apps/api/src/modules/auth/routes.ts
// Auth con validación Zod (I5). Mantiene el rate-limit por IP de /guest.
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../lib/db';
import { validateBody, emptyToUndefined } from '../../lib/validate';
import { isDbUnreachable, REGISTER_DB_DOWN_MESSAGE, DB_DOWN_MESSAGE } from '../../lib/errors';
import { LEGAL_VERSIONS } from '../../lib/legal';
import { deleteRoomSession } from '../../services/roomSession';
import { deleteRoomInvites } from '../../lib/inviteStore';
import { accountBlockReason } from '../../lib/accountStatus';

// ── Esquemas ─────────────────────────────────────────────────
const registerSchema = z.object({
  email: z.preprocess(emptyToUndefined, z.string().email('email inválido').optional()),
  username: z.string().trim().min(2, 'mínimo 2 caracteres').max(30, 'máximo 30 caracteres'),
  password: z.string().min(6, 'mínimo 6 caracteres').max(200),
  // Consentimiento legal: ambos obligatorios. marketing es opcional.
  acceptedTerms: z.boolean().optional(),
  acceptedPrivacy: z.boolean().optional(),
  marketingOptIn: z.boolean().optional(),
});

// El campo `email` acepta EMAIL O NOMBRE DE USUARIO (identificador). Se mantiene el
// nombre `email` para no romper el contrato del front; el backend resuelve cuál es.
const loginSchema = z.object({
  email: z.string().trim().min(1, 'requerido'),
  password: z.string().min(1, 'requerido'),
});

const guestSchema = z.object({
  displayName: z.string().trim().min(2, 'mínimo 2 caracteres').max(30, 'máximo 30 caracteres'),
});

const updateProfileSchema = z.object({
  username: z.string().trim().min(2, 'mínimo 2 caracteres').max(30, 'máximo 30 caracteres').optional(),
  avatar: z.preprocess(emptyToUndefined, z.string().max(1000).nullish()),
});

const deleteAccountSchema = z.object({
  password: z.preprocess(emptyToUndefined, z.string().max(200).optional()),
});

const signToken = (sub: string, extra: object = {}, expiresIn: string = '7d') =>
  jwt.sign({ sub, ...extra }, process.env.JWT_SECRET as string, { expiresIn } as any);

const router: FastifyPluginAsync = async (fastify) => {

  // Rate-limit por IP para credenciales (anti fuerza bruta / creación masiva).
  const authRateLimit = {
    max: Number(process.env.AUTH_RATELIMIT_MAX) || 10,
    timeWindow: process.env.AUTH_RATELIMIT_WINDOW || '1 minute',
  };

  // ── POST /register ───────────────────────────────────────
  fastify.post('/register', { config: { rateLimit: authRateLimit }, preHandler: validateBody(registerSchema) }, async (request, reply) => {
    const { email, username, password, acceptedTerms, acceptedPrivacy, marketingOptIn } =
      request.body as z.infer<typeof registerSchema>;

    // Consentimiento obligatorio: no se puede registrar sin aceptar Términos y Privacidad.
    if (!acceptedTerms || !acceptedPrivacy) {
      return reply.status(400).send({
        error: 'Debés aceptar los Términos y Condiciones y la Política de Privacidad para crear tu cuenta',
      });
    }

    try {
      if (await prisma.user.findFirst({ where: { username } })) {
        return reply.status(409).send({ error: 'El nombre de usuario ya está tomado' });
      }
      if (email && await prisma.user.findFirst({ where: { email } })) {
        return reply.status(409).send({ error: 'El email ya está registrado' });
      }

      const hashed = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: { email: email ?? null, username, password: hashed },
      });

      // Evidencia de consentimiento (append-only): versión + IP + user-agent.
      const ip = request.ip;
      const userAgent = (request.headers['user-agent'] || '').slice(0, 400);
      const consents = [
        { userId: user.id, docType: 'terms', docVersion: LEGAL_VERSIONS.terms, accepted: true, ip, userAgent },
        { userId: user.id, docType: 'privacy', docVersion: LEGAL_VERSIONS.privacy, accepted: true, ip, userAgent },
      ];
      if (marketingOptIn) {
        consents.push({ userId: user.id, docType: 'marketing', docVersion: LEGAL_VERSIONS.marketing, accepted: true, ip, userAgent });
      }
      // No bloquear el registro si el log de consentimiento falla; se registra el error.
      try {
        await prisma.legalAcceptance.createMany({ data: consents });
      } catch (consentErr) {
        request.log.error({ consentErr }, 'no se pudo registrar el consentimiento');
      }

      return reply.status(201).send({
        user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, role: user.role },
        token: signToken(user.id),
      });
    } catch (err) {
      request.log.error({ err }, 'register failed');
      if (isDbUnreachable(err)) {
        return reply.status(503).send({ error: REGISTER_DB_DOWN_MESSAGE });
      }
      throw err; // lo toma el error handler global (mensaje genérico, sin internos)
    }
  });

  // ── POST /login ──────────────────────────────────────────
  fastify.post('/login', { config: { rateLimit: authRateLimit }, preHandler: validateBody(loginSchema) }, async (request, reply) => {
    const { email, password } = request.body as z.infer<typeof loginSchema>;

    // El identificador puede ser un email o un nombre de usuario.
    const identifier = email.trim();
    const isEmail = /^\S+@\S+\.\S+$/.test(identifier);

    try {
      // Por email (único) o por username de un usuario REGISTRADO (no invitado:
      // `username` no es único en DB y los invitados crean filas con username libre).
      const user = await prisma.user.findFirst({
        where: isEmail ? { email: identifier } : { username: identifier, isGuest: false },
      });
      if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
        return reply.status(401).send({ error: 'Usuario o contraseña incorrectos' });
      }

      // Enforcement de moderación: cuentas no activas no pueden iniciar sesión.
      const blocked = accountBlockReason(user);
      if (blocked) return reply.status(403).send({ error: blocked });

      // Bootstrap de admin: los emails de ADMIN_EMAILS se promueven a ADMIN al entrar.
      let role = user.role;
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
      if (user.email && role !== 'ADMIN' && adminEmails.includes(user.email.toLowerCase())) {
        await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
        role = 'ADMIN';
      }

      return reply.send({
        user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, role },
        token: signToken(user.id),
      });
    } catch (err) {
      request.log.error({ err }, 'login failed');
      if (isDbUnreachable(err)) {
        return reply.status(503).send({ error: DB_DOWN_MESSAGE });
      }
      throw err;
    }
  });

  // ── GET /me ──────────────────────────────────────────────
  fastify.get('/me', async (request, reply) => {
    const auth = request.headers.authorization;
    if (!auth) return reply.status(401).send({ error: 'Unauthorized' });
    const token = auth.replace(/^Bearer\s+/, '');
    try {
      const payload: any = jwt.verify(token, process.env.JWT_SECRET as string);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, username: true, email: true, avatar: true, role: true },
      });
      if (!user) return reply.status(404).send({ error: 'User not found' });
      reply.send({ user });
    } catch {
      reply.status(401).send({ error: 'Invalid token' });
    }
  });

  // ── POST /guest — Token de invitado sin registro ─────────
  // Rate-limit específico por IP (cada guest crea una fila User real).
  // La limpieza periódica (services/guestCleanup) borra los obsoletos.
  fastify.post('/guest', {
    config: {
      rateLimit: {
        max: Number(process.env.GUEST_RATELIMIT_MAX) || 10,
        timeWindow: process.env.GUEST_RATELIMIT_WINDOW || '1 minute',
      },
    },
    preHandler: validateBody(guestSchema),
  }, async (request, reply) => {
    const { displayName } = request.body as z.infer<typeof guestSchema>;

    try {
      const guestUser = await prisma.user.create({
        data: { username: displayName, isGuest: true },
      });

      return reply.status(201).send({
        user: { id: guestUser.id, username: guestUser.username, guest: true },
        token: signToken(guestUser.id, { guest: true }, '24h'),
      });
    } catch (err) {
      request.log.error({ err }, 'guest failed');
      if (isDbUnreachable(err)) {
        return reply.status(503).send({ error: DB_DOWN_MESSAGE });
      }
      throw err;
    }
  });

  // ── PUT /me — Actualizar perfil ──────────────────────────
  fastify.put('/me', { preHandler: validateBody(updateProfileSchema) }, async (request, reply) => {
    const auth = request.headers.authorization;
    if (!auth) return reply.status(401).send({ error: 'Unauthorized' });
    const token = auth.replace(/^Bearer\s+/, '');
    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET as string);
    } catch {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    const { username, avatar } = request.body as z.infer<typeof updateProfileSchema>;
    const data: any = {};

    if (username) {
      const existing = await prisma.user.findFirst({
        where: { username, NOT: { id: payload.sub } },
      });
      if (existing) return reply.status(409).send({ error: 'El nombre de usuario ya está tomado' });
      data.username = username;
    }
    if (avatar !== undefined) data.avatar = avatar || null;

    const user = await prisma.user.update({
      where: { id: payload.sub },
      data,
      select: { id: true, username: true, email: true, avatar: true, role: true },
    });
    reply.send({ user });
  });

  // ── DELETE /account — Eliminar la cuenta del usuario ─────
  // Derecho de supresión. Requiere reingreso de contraseña (si la cuenta tiene una).
  // Borra las salas propias (cascada: miembros/mensajes/videos) y el usuario
  // (cascada: consentimientos; SetNull en reportes y membresías de otras salas).
  fastify.delete('/account', { preHandler: validateBody(deleteAccountSchema) }, async (request, reply) => {
    const auth = request.headers.authorization;
    if (!auth) return reply.status(401).send({ error: 'Unauthorized' });
    const token = auth.replace(/^Bearer\s+/, '');
    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET as string);
    } catch {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    const { password } = request.body as z.infer<typeof deleteAccountSchema>;

    try {
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) return reply.status(404).send({ error: 'User not found' });

      // Si la cuenta tiene contraseña, exigir reingreso correcto.
      if (user.password) {
        if (!password) return reply.status(400).send({ error: 'Ingresá tu contraseña para confirmar' });
        if (!(await bcrypt.compare(password, user.password))) {
          return reply.status(401).send({ error: 'Contraseña incorrecta' });
        }
      }

      // Limpiar runtime en memoria de las salas propias antes de borrarlas.
      const ownedRooms = await prisma.room.findMany({ where: { ownerId: user.id }, select: { id: true } });
      for (const r of ownedRooms) {
        try { await deleteRoomSession(r.id); } catch { /* best-effort */ }
        try { deleteRoomInvites(r.id); } catch { /* best-effort */ }
      }
      await prisma.room.deleteMany({ where: { ownerId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });

      return reply.send({ ok: true });
    } catch (err) {
      request.log.error({ err }, 'account deletion failed');
      if (isDbUnreachable(err)) return reply.status(503).send({ error: DB_DOWN_MESSAGE });
      throw err;
    }
  });
};

export default router;
