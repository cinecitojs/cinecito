// ============================================================
// apps/api/src/sockets/socket.ts
// Gateway de tiempo real: chat, presencia, typing, control de video
// con permisos configurables, y mensajes de sistema efímeros.
// ============================================================

import fp from 'fastify-plugin';
import { Server as IOServer, Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import { logger } from '../lib/logger';
import jwt from 'jsonwebtoken';
import { createRedisAdapter } from './adapter';
import { attachSignaling } from '../webrtc/signaling';
import { redis } from '../lib/redis';
import { prisma } from '../lib/db';
import { corsOrigins } from '../../config/env';
import { isMemberOrOwner } from '../lib/acl';
import { accountBlockReason } from '../lib/accountStatus';
import { getRoomSession } from '../services/roomSession';
import { applyVideoCommand } from '../services/videoSync';
import {
  canDoVideoAction,
  isController,
  getRoomControl,
  invalidateRoomControl,
  normalizePermissions,
  DEFAULT_PERMISSIONS,
  type VideoAction,
} from '../lib/permissions';
import { addTyping, removeTyping, removeTypingEverywhere, checkRate, clearRate } from '../lib/roomRuntime';
import { setSoleHost, upsertRoomMember } from '../lib/members';
import { toggleReaction, attachReactions } from '../lib/reactionStore';
import {
  createOrGetRequest, getRequest, setRequestStatus, listRequests, pendingCount,
} from '../lib/joinRequestStore';
import {
  isMuted, setMuted, listMuted, isBanned, setBan, getRoomSettings, patchRoomSettings,
} from '../lib/roomModerationStore';

const MSG_LIMIT  = 5;
const MSG_WINDOW = 3000;

// ── Mensaje de sistema EFÍMERO (no se persiste en DB) ────────
// join/leave/transfer son ruido: se transmiten en vivo pero no
// contaminan el historial paginado de la sala.
function emitSystem(io: IOServer, roomId: string, content: string) {
  io.to(roomId).emit('system', {
    id: `sys_${randomUUID()}`,
    roomId,
    userId: null,
    content,
    system: true,
    createdAt: new Date().toISOString(),
  });
}

export default fp(async function (fastify, _opts) {
  const io = new IOServer(fastify.server, {
    // Dev: refleja cualquier origen (LAN). Prod: lista de FRONTEND_URL (coma-separable).
    cors: {
      origin: corsOrigins(),
    },
  });

  try {
    const adapter = await createRedisAdapter(process.env.REDIS_URL as string);
    if (adapter) io.adapter(adapter);
  } catch (err: any) {
    logger.error({ err }, 'Failed to apply Redis adapter');
  }

  // ── Auth middleware ──────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      (socket as any).data.userId   = null;
      (socket as any).data.username = 'Invitado';
      return next();
    }
    try {
      const payload: any = jwt.verify(token, process.env.JWT_SECRET as string);
      (socket as any).data.userId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  attachSignaling(io);

  io.on('connection', (socket: Socket) => {
    logger.info({ id: socket.id }, 'socket connected');

    const userId: string | null = (socket as any).data.userId;
    (socket as any).data.username = 'Invitado';
    // Sala personal por usuario → permite emitir a TODOS los sockets de un usuario
    // (solicitudes de acceso aceptadas/rechazadas, avisos al host, etc.).
    if (userId) socket.join('user:' + userId);

    // El username se carga en SEGUNDO PLANO. No debe bloquear el registro de
    // listeners: si se hace `await` antes de `socket.on(...)`, los eventos que
    // el cliente emite al conectar (p.ej. join-room) se pierden y el ack nunca
    // llega → timeouts. Los handlers que necesitan el nombre hacen `await usernameReady`.
    const usernameReady = (async () => {
      if (!userId) return;
      redis.sadd(`presence:${userId}`, socket.id);
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true, avatar: true, status: true, statusReason: true, suspendedUntil: true },
        });
        // Enforcement de moderación en tiempo real: si la cuenta fue eliminada o
        // bloqueada/suspendida DESPUÉS de emitir el token, se corta la sesión acá
        // (reusa esta misma query → sin costo extra). En error de DB NO desconectamos
        // (fail-open por disponibilidad). join-room respeta data.blocked.
        if (!user) {
          (socket as any).data.blocked = 'Esta cuenta ya no existe.';
          socket.emit('account_blocked', { reason: (socket as any).data.blocked });
          return socket.disconnect(true);
        }
        const reason = accountBlockReason(user);
        if (reason) {
          (socket as any).data.blocked = reason;
          socket.emit('account_blocked', { reason });
          return socket.disconnect(true);
        }
        (socket as any).data.username = user.username;
        (socket as any).data.avatar = user.avatar ?? null;
      } catch { /* DB inaccesible: no desconectar (fail-open) */ }
    })();
    const getUsername = (): string => (socket as any).data.username || 'Invitado';

    // ── join-room ──────────────────────────────────────────
    socket.on('join-room', async (data, ack) => {
      try {
        await usernameReady; // el nombre puede estar cargándose; no bloquea el registro del listener
        // Cuenta bloqueada/suspendida/eliminada: no puede entrar a salas.
        if ((socket as any).data.blocked) {
          const err = { error: 'account_blocked', message: (socket as any).data.blocked as string };
          return typeof ack === 'function' ? ack(err) : socket.emit('join-error', err);
        }
        const { roomId } = (data as any) || {};
        if (!roomId) {
          const err = { error: 'invalid_payload', message: 'roomId required' };
          return typeof ack === 'function' ? ack(err) : socket.emit('join-error', err);
        }

        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (!room) {
          const err = { error: 'not_found', message: 'Room not found' };
          return typeof ack === 'function' ? ack(err) : socket.emit('join-error', err);
        }

        if (room.isPrivate) {
          const allowed = await isMemberOrOwner(roomId, userId ?? undefined);
          if (!allowed) {
            // Sala "Solo invitación": no es 403 ciego → el front muestra "Solicitar acceso".
            if ((room as any).inviteOnly && userId) {
              const err = { error: 'request_required', message: 'Esta sala es solo por invitación', roomName: room.name, roomId };
              return typeof ack === 'function' ? ack(err) : socket.emit('join-error', err);
            }
            // Privada normal (sin cambios).
            const err = userId
              ? { error: 'forbidden', message: 'Not a member of this private room' }
              : { error: 'unauthorized', message: 'Authentication required' };
            return typeof ack === 'function' ? ack(err) : socket.emit('join-error', err);
          }
        }

        // Baneo temporal por el host: no puede reingresar hasta que expire.
        const ban = isBanned(roomId, userId);
        if (ban.banned) {
          const err = { error: 'banned', message: 'El anfitrión te quitó de esta sala por un rato.', until: ban.until };
          return typeof ack === 'function' ? ack(err) : socket.emit('join-error', err);
        }

        // ¿Reingreso del mismo socket? evita anunciar "se unió" en reconexiones.
        const isRejoin = (socket as any).data.currentRoom === roomId;
        socket.join(roomId);
        (socket as any).data.currentRoom = roomId;

        // Historial REAL de chat (sin mensajes de sistema, que ya no se persisten).
        const rawMessages = await prisma.message.findMany({
          where: { roomId },
          orderBy: { createdAt: 'asc' },
          take: 50,
          include: { user: { select: { id: true, username: true, avatar: true } } },
        });
        // Adjuntar reacciones actuales a cada mensaje (para que se vean al (re)entrar).
        const messages = attachReactions(rawMessages);

        const session = await getRoomSession(roomId);

        const socketsInRoom = await io.in(roomId).fetchSockets();
        const onlineUserIds = [...new Set(
          socketsInRoom.map((s: any) => s.data?.userId).filter(Boolean) as string[],
        )];

        const control = await getRoomControl(roomId);
        const hostStatus = await isController(roomId, userId ?? undefined);

        if (userId && !isRejoin) {
          emitSystem(io, roomId, `${getUsername()} se unió a la sala`);
          socket.to(roomId).emit('user-joined', { socketId: socket.id, userId, username: getUsername() });
        }

        if (typeof ack === 'function') {
          ack({
            ok: true,
            session,
            messages,
            onlineUserIds,
            isHost: hostStatus,
            permissions: control?.permissions ?? DEFAULT_PERMISSIONS,
            settings: getRoomSettings(roomId),
            muted: isMuted(roomId, userId),
            serverTime: Date.now(),
          });
        }
      } catch (err: any) {
        logger.error({ err }, 'join-room failed');
        const e = { error: 'internal', message: 'Internal server error' };
        return typeof ack === 'function' ? ack(e) : socket.emit('join-error', e);
      }
    });

    // ── leave-room ────────────────────────────────────────
    async function doLeave(roomId: string, announce: boolean) {
      socket.leave(roomId);
      if ((socket as any).data.currentRoom === roomId) (socket as any).data.currentRoom = null;

      const updated = userId ? await removeTyping(roomId, userId) : [];
      if (userId) io.to(roomId).emit('typing-update', { typingUserIds: updated });

      if (announce && userId) {
        socket.to(roomId).emit('user-left', { socketId: socket.id, userId });
        emitSystem(io, roomId, `${getUsername()} salió de la sala`);
      }
    }

    socket.on('leave-room', async (data) => {
      const { roomId } = (data as any) || {};
      if (!roomId) return;
      await doLeave(roomId, true).catch(() => {});
    });

    // ── Solicitudes de acceso (salas "Solo invitación") ───────
    // Avisa a TODOS los hosts (owner + controlador) por su sala personal.
    async function notifyHosts(roomId: string, event: string, payload: any) {
      const hostIds = new Set<string>();
      try {
        const room = await prisma.room.findUnique({ where: { id: roomId }, select: { ownerId: true } });
        if (room?.ownerId) hostIds.add(room.ownerId);
        const control = await getRoomControl(roomId);
        if (control?.controllerUserId) hostIds.add(control.controllerUserId);
      } catch { /* */ }
      for (const hid of hostIds) io.to('user:' + hid).emit(event, payload);
    }
    const isRoomHost = (roomId: string, uid?: string | null) => isController(roomId, uid ?? undefined);

    // Solicitante pide acceso.
    socket.on('request-join', async (data, ack) => {
      try {
        await usernameReady;
        const { roomId } = (data as any) || {};
        if (!roomId || !userId) return typeof ack === 'function' ? ack({ error: 'invalid' }) : undefined;
        if (!(await checkRate(`reqjoin:${userId}`, 5, 10000))) {
          return typeof ack === 'function' ? ack({ error: 'rate_limited', message: 'Esperá un momento antes de volver a solicitar' }) : undefined;
        }
        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (!room) return typeof ack === 'function' ? ack({ error: 'not_found' }) : undefined;
        if (!(room as any).inviteOnly) return typeof ack === 'function' ? ack({ error: 'not_invite_only' }) : undefined;
        if (await isMemberOrOwner(roomId, userId)) return typeof ack === 'function' ? ack({ ok: true, status: 'accepted' }) : undefined;

        const me = await prisma.user.findUnique({ where: { id: userId }, select: { avatar: true } }).catch(() => null);
        const { request, isNew } = createOrGetRequest(roomId, { userId, username: getUsername(), avatar: me?.avatar ?? null });
        if (isNew) await notifyHosts(roomId, 'join-request-new', { request, pending: pendingCount(roomId) });
        if (typeof ack === 'function') ack({ ok: true, status: request.status });
      } catch (err: any) {
        logger.error({ err }, 'request-join failed');
        if (typeof ack === 'function') ack({ error: 'internal' });
      }
    });

    // Host pide la lista (al abrir la bandeja).
    socket.on('list-join-requests', async (data, ack) => {
      const { roomId } = (data as any) || {};
      if (!roomId || !(await isRoomHost(roomId, userId))) {
        return typeof ack === 'function' ? ack({ error: 'forbidden', requests: [] }) : undefined;
      }
      if (typeof ack === 'function') ack({ ok: true, requests: listRequests(roomId), pending: pendingCount(roomId) });
    });

    // Host responde: aceptar / rechazar / ignorar. Validado en BACKEND (no solo UI).
    socket.on('respond-join-request', async (data, ack) => {
      try {
        const { roomId, userId: targetId, action } = (data as any) || {};
        if (!roomId || !targetId || !['accept', 'reject', 'ignore'].includes(action)) {
          return typeof ack === 'function' ? ack({ error: 'invalid' }) : undefined;
        }
        if (!(await isRoomHost(roomId, userId))) {
          return typeof ack === 'function' ? ack({ error: 'forbidden' }) : undefined; // nadie se autoaprueba
        }
        const req = getRequest(roomId, targetId);
        if (!req) return typeof ack === 'function' ? ack({ error: 'not_found' }) : undefined;

        if (action === 'accept') {
          await upsertRoomMember(roomId, targetId, req.username);
          setRequestStatus(roomId, targetId, 'accepted');
          io.to('user:' + targetId).emit('join-request-resolved', { roomId, status: 'accepted' });
        } else if (action === 'reject') {
          setRequestStatus(roomId, targetId, 'rejected');
          io.to('user:' + targetId).emit('join-request-resolved', { roomId, status: 'rejected' });
        } else {
          setRequestStatus(roomId, targetId, 'ignored');
        }
        await notifyHosts(roomId, 'join-requests-updated', { requests: listRequests(roomId), pending: pendingCount(roomId) });
        if (typeof ack === 'function') ack({ ok: true });
      } catch (err: any) {
        logger.error({ err }, 'respond-join-request failed');
        if (typeof ack === 'function') ack({ error: 'internal' });
      }
    });

    // ── send-message ──────────────────────────────────────
    socket.on('send-message', async (data, ack) => {
      try {
        const rateKey = `msg:${userId || socket.id}`;
        if (!(await checkRate(rateKey, MSG_LIMIT, MSG_WINDOW))) {
          const err = { error: 'rate_limited', message: 'Demasiados mensajes. Esperá un momento.' };
          return typeof ack === 'function' ? ack(err) : socket.emit('message-error', err);
        }

        const { roomId, content } = (data as any) || {};
        if (!roomId || !content?.trim()) {
          const err = { error: 'invalid_payload', message: 'roomId and content required' };
          return typeof ack === 'function' ? ack(err) : socket.emit('message-error', err);
        }
        if (content.length > 500) {
          const err = { error: 'too_long', message: 'Máximo 500 caracteres' };
          return typeof ack === 'function' ? ack(err) : socket.emit('message-error', err);
        }

        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (!room) {
          const err = { error: 'not_found', message: 'Room not found' };
          return typeof ack === 'function' ? ack(err) : socket.emit('message-error', err);
        }

        if (room.isPrivate) {
          const allowed = await isMemberOrOwner(roomId, userId ?? undefined);
          if (!allowed) {
            const err = { error: 'forbidden', message: 'Not a member' };
            return typeof ack === 'function' ? ack(err) : socket.emit('message-error', err);
          }
        }

        // Moderación: silenciado por el host.
        if (isMuted(roomId, userId)) {
          const err = { error: 'muted', message: 'Estás silenciado en esta sala.' };
          return typeof ack === 'function' ? ack(err) : socket.emit('message-error', err);
        }
        // Chat desactivado por el host (el host sí puede seguir escribiendo).
        if (!getRoomSettings(roomId).chatEnabled && !(await isController(roomId, userId ?? undefined))) {
          const err = { error: 'chat_disabled', message: 'El anfitrión desactivó el chat.' };
          return typeof ack === 'function' ? ack(err) : socket.emit('message-error', err);
        }

        const saved = await prisma.message.create({
          data: { roomId, userId: userId || null, content: content.trim() },
          include: { user: { select: { id: true, username: true, avatar: true } } },
        });

        if (userId) {
          const updated = await removeTyping(roomId, userId);
          io.to(roomId).emit('typing-update', { typingUserIds: updated });
        }

        io.to(roomId).emit('message', saved);
        if (typeof ack === 'function') ack({ ok: true, message: saved });
      } catch (err: any) {
        logger.error({ err }, 'send-message failed');
        const e = { error: 'internal', message: 'Internal server error' };
        return typeof ack === 'function' ? ack(e) : socket.emit('message-error', e);
      }
    });

    // ── message-reaction (toggle emoji por mensaje) ───────
    socket.on('message-reaction', async (data, ack) => {
      try {
        const { roomId, messageId, emoji } = (data as any) || {};
        if (!userId) {
          const err = { error: 'unauthorized', message: 'Auth required' };
          return typeof ack === 'function' ? ack(err) : undefined;
        }
        if (!roomId || !messageId || !emoji || String(emoji).length > 16) {
          const err = { error: 'invalid_payload', message: 'roomId, messageId y emoji requeridos' };
          return typeof ack === 'function' ? ack(err) : undefined;
        }
        if (!(await checkRate(`react:${userId}`, 20, 3000))) {
          const err = { error: 'rate_limited', message: 'Demasiadas reacciones' };
          return typeof ack === 'function' ? ack(err) : undefined;
        }
        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (!room) {
          const err = { error: 'not_found', message: 'Room not found' };
          return typeof ack === 'function' ? ack(err) : undefined;
        }
        if (room.isPrivate && !(await isMemberOrOwner(roomId, userId))) {
          const err = { error: 'forbidden', message: 'Not a member' };
          return typeof ack === 'function' ? ack(err) : undefined;
        }
        const reactions = toggleReaction(messageId, emoji, userId);
        io.to(roomId).emit('message-reaction-update', { messageId, reactions });
        if (typeof ack === 'function') ack({ ok: true, reactions });
      } catch (err: any) {
        logger.error({ err }, 'message-reaction failed');
        if (typeof ack === 'function') ack({ error: 'internal', message: 'Internal server error' });
      }
    });

    // ── room-reaction (reacción flotante EFÍMERA sobre el video) ───────
    // No se persiste: se difunde a toda la sala y desaparece sola en el cliente.
    // Whitelist + rate-limit suave para que no se pueda spamear ni inyectar texto.
    const REACTION_EMOJIS = new Set(['❤️', '😂', '😮', '👏', '🔥', '😍', '😢', '👍', '🎉', '💯']);
    socket.on('room-reaction', async (data) => {
      try {
        const { roomId, emoji } = (data as any) || {};
        if (!userId || !roomId || !REACTION_EMOJIS.has(emoji)) return;
        // Hasta ~8 reacciones cada 4s por usuario: expresivo pero sin inundar.
        if (!(await checkRate(`rreact:${userId}`, 8, 4000))) return;
        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (!room) return;
        if (room.isPrivate && !(await isMemberOrOwner(roomId, userId))) return;
        if (!getRoomSettings(roomId).reactionsEnabled) return; // el host desactivó las reacciones
        // Incluye al emisor (io.to) para que vea su propia reacción sincronizada.
        io.to(roomId).emit('room-reaction', { emoji, userId });
      } catch (err: any) {
        logger.error({ err }, 'room-reaction failed');
      }
    });

    // ── typing-start / typing-stop ────────────────────────
    socket.on('typing-start', async (data) => {
      const { roomId } = (data as any) || {};
      if (!roomId || !userId) return;
      const list = await addTyping(roomId, userId);
      socket.to(roomId).emit('typing-update', { typingUserIds: list });
    });

    socket.on('typing-stop', async (data) => {
      const { roomId } = (data as any) || {};
      if (!roomId || !userId) return;
      const list = await removeTyping(roomId, userId);
      socket.to(roomId).emit('typing-update', { typingUserIds: list });
    });

    // ── VIDEO EVENTS (con permisos por acción) ────────────
    async function handleVideoCommand(
      eventName: string,
      action: VideoAction,
      data: any,
      ack: any,
      command: Parameters<typeof applyVideoCommand>[2],
    ) {
      try {
        const { roomId } = (data as any) || {};
        if (!roomId) {
          const err = { error: 'invalid_payload', message: 'roomId required' };
          return typeof ack === 'function' ? ack(err) : socket.emit('video-error', err);
        }
        // Anti-abuso: límite de comandos de video por socket.
        if (!(await checkRate(`vid:${socket.id}`, 15, 2000))) {
          const err = { error: 'rate_limited', message: 'Demasiados comandos de video' };
          return typeof ack === 'function' ? ack(err) : socket.emit('video-error', err);
        }
        // `inRoom`: el socket está unido a la sala = prueba de presencia para el modo colaborativo.
        const allowed = await canDoVideoAction(roomId, userId ?? undefined, action, { inRoom: socket.rooms.has(roomId) });
        if (!allowed) {
          const err = { error: 'forbidden', message: 'No tenés permiso para esta acción' };
          return typeof ack === 'function' ? ack(err) : socket.emit('video-error', err);
        }

        const session = await applyVideoCommand(fastify as any, roomId, command);
        if (typeof ack === 'function') ack({ ok: true, session, serverTime: Date.now() });
      } catch (err: any) {
        logger.error({ err }, `${eventName} failed`);
        const e = { error: 'internal', message: 'Internal server error' };
        return typeof ack === 'function' ? ack(e) : socket.emit('video-error', e);
      }
    }

    socket.on('video-play',   (d, ack) => handleVideoCommand('video-play',   'pauseResume', d, ack, { type: 'play',   seekTime: d?.seekTime }));
    socket.on('video-pause',  (d, ack) => handleVideoCommand('video-pause',  'pauseResume', d, ack, { type: 'pause',  seekTime: d?.seekTime }));
    socket.on('video-seek',   (d, ack) => handleVideoCommand('video-seek',   'seek',        d, ack, { type: 'seek',   seekTime: d?.seekTime }));
    socket.on('video-select', (d, ack) => handleVideoCommand('video-select', 'skip',        d, ack, { type: 'select', videoId: d?.videoId }));

    // ── update-permissions (solo owner/controlador) ──────
    socket.on('update-permissions', async (data, ack) => {
      try {
        const { roomId, permissions } = (data as any) || {};
        if (!roomId) {
          const err = { error: 'invalid_payload', message: 'roomId required' };
          return typeof ack === 'function' ? ack(err) : undefined;
        }
        if (!(await isController(roomId, userId ?? undefined))) {
          const err = { error: 'forbidden', message: 'Solo el host puede cambiar permisos' };
          return typeof ack === 'function' ? ack(err) : undefined;
        }
        const normalized = normalizePermissions(permissions);
        await prisma.room.update({ where: { id: roomId }, data: { permissions: normalized as any } });
        invalidateRoomControl(roomId);
        io.to(roomId).emit('permissions-updated', { permissions: normalized });
        if (typeof ack === 'function') ack({ ok: true, permissions: normalized });
      } catch (err: any) {
        logger.error({ err }, 'update-permissions failed');
        if (typeof ack === 'function') ack({ error: 'internal', message: 'Internal server error' });
      }
    });

    // ── request-sync ──────────────────────────────────────
    socket.on('request-sync', async (data, ack) => {
      try {
        const { roomId } = (data as any) || {};
        if (!roomId) return;
        const session = await getRoomSession(roomId);
        if (!session) {
          if (typeof ack === 'function') ack({ ok: true, session: null, serverTime: Date.now() });
          return;
        }
        const now     = Date.now();
        const elapsed = session.isPlaying
          ? (now - new Date(session.updatedAt).getTime()) / 1000
          : 0;
        const adjusted = { ...session, currentTime: session.currentTime + elapsed };
        if (typeof ack === 'function') ack({ ok: true, session: adjusted, serverTime: now });
        else socket.emit('room-state', { session: adjusted, serverTime: now });
      } catch (err: any) {
        logger.error({ err }, 'request-sync failed');
      }
    });

    // ── transfer-host ─────────────────────────────────────
    socket.on('transfer-host', async (data, ack) => {
      try {
        const { roomId, targetUserId } = (data as any) || {};
        if (!roomId || !targetUserId) {
          const err = { error: 'invalid_payload', message: 'roomId and targetUserId required' };
          return typeof ack === 'function' ? ack(err) : socket.emit('transfer-host-error', err);
        }
        // Solo el owner o el controlador actual pueden ceder el control.
        if (!(await isController(roomId, userId ?? undefined))) {
          const err = { error: 'forbidden', message: 'Solo el host puede transferir el control' };
          return typeof ack === 'function' ? ack(err) : socket.emit('transfer-host-error', err);
        }

        // El destino debe existir como miembro (lo creamos si hace falta).
        const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { username: true } });
        if (!target) {
          const err = { error: 'not_found', message: 'Usuario destino no encontrado' };
          return typeof ack === 'function' ? ack(err) : socket.emit('transfer-host-error', err);
        }

        await setSoleHost(roomId, targetUserId, target.username);
        invalidateRoomControl(roomId);

        emitSystem(io, roomId, `${getUsername()} le pasó el control a ${target.username}`);
        io.to(roomId).emit('host-changed', { newHostId: targetUserId, previousHostId: userId });
        if (typeof ack === 'function') ack({ ok: true });
      } catch (err: any) {
        logger.error({ err }, 'transfer-host failed');
        const e = { error: 'internal', message: 'Internal server error' };
        return typeof ack === 'function' ? ack(e) : socket.emit('transfer-host-error', e);
      }
    });

    // ── kick-user (expulsar; con baneo temporal opcional) ─────
    socket.on('kick-user', async (data, ack) => {
      try {
        const { roomId, targetUserId, banMinutes } = (data as any) || {};
        if (!roomId || !targetUserId) return typeof ack === 'function' ? ack({ error: 'invalid' }) : undefined;
        if (!(await isController(roomId, userId ?? undefined))) return typeof ack === 'function' ? ack({ error: 'forbidden' }) : undefined;
        if (targetUserId === userId) return typeof ack === 'function' ? ack({ error: 'self', message: 'No podés expulsarte a vos.' }) : undefined;
        const room = await prisma.room.findUnique({ where: { id: roomId }, select: { ownerId: true } });
        if (room?.ownerId && room.ownerId === targetUserId) {
          return typeof ack === 'function' ? ack({ error: 'cannot_kick_owner', message: 'No se puede expulsar al dueño de la sala.' }) : undefined;
        }

        const minutes = Math.min(Math.max(parseInt(banMinutes, 10) || 0, 0), 24 * 60);
        const until = minutes > 0 ? setBan(roomId, targetUserId, minutes) : undefined;

        const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { username: true } }).catch(() => null);
        // Sacar de la sala a todos los sockets del usuario destino.
        const socketsInRoom = await io.in(roomId).fetchSockets();
        for (const s of socketsInRoom) {
          if ((s as any).data?.userId === targetUserId) {
            s.leave(roomId);
            (s as any).data.currentRoom = null;
          }
        }
        io.to('user:' + targetUserId).emit('kicked', { roomId, banned: minutes > 0, until });
        io.to(roomId).emit('user-left', { socketId: null, userId: targetUserId });
        emitSystem(io, roomId, `${getUsername()} sacó a ${target?.username || 'alguien'} de la sala`);
        if (typeof ack === 'function') ack({ ok: true });
      } catch (err: any) {
        logger.error({ err }, 'kick-user failed');
        if (typeof ack === 'function') ack({ error: 'internal' });
      }
    });

    // ── mute-user (silenciar / dessilenciar en el chat) ───────
    socket.on('mute-user', async (data, ack) => {
      try {
        const { roomId, targetUserId, muted } = (data as any) || {};
        if (!roomId || !targetUserId) return typeof ack === 'function' ? ack({ error: 'invalid' }) : undefined;
        if (!(await isController(roomId, userId ?? undefined))) return typeof ack === 'function' ? ack({ error: 'forbidden' }) : undefined;
        if (targetUserId === userId) return typeof ack === 'function' ? ack({ error: 'self' }) : undefined;
        setMuted(roomId, targetUserId, !!muted);
        io.to('user:' + targetUserId).emit('you-muted', { roomId, muted: !!muted });
        io.to(roomId).emit('user-muted', { userId: targetUserId, muted: !!muted, mutedUserIds: listMuted(roomId) });
        if (typeof ack === 'function') ack({ ok: true, mutedUserIds: listMuted(roomId) });
      } catch (err: any) {
        logger.error({ err }, 'mute-user failed');
        if (typeof ack === 'function') ack({ error: 'internal' });
      }
    });

    // ── delete-message (borrar un mensaje) ────────────────────
    socket.on('delete-message', async (data, ack) => {
      try {
        const { roomId, messageId } = (data as any) || {};
        if (!roomId || !messageId) return typeof ack === 'function' ? ack({ error: 'invalid' }) : undefined;
        if (!(await isController(roomId, userId ?? undefined))) return typeof ack === 'function' ? ack({ error: 'forbidden' }) : undefined;
        await prisma.message.deleteMany({ where: { id: messageId, roomId } });
        io.to(roomId).emit('message-deleted', { messageId });
        if (typeof ack === 'function') ack({ ok: true });
      } catch (err: any) {
        logger.error({ err }, 'delete-message failed');
        if (typeof ack === 'function') ack({ error: 'internal' });
      }
    });

    // ── clear-chat (limpiar historial) ────────────────────────
    socket.on('clear-chat', async (data, ack) => {
      try {
        const { roomId } = (data as any) || {};
        if (!roomId) return typeof ack === 'function' ? ack({ error: 'invalid' }) : undefined;
        if (!(await isController(roomId, userId ?? undefined))) return typeof ack === 'function' ? ack({ error: 'forbidden' }) : undefined;
        await prisma.message.deleteMany({ where: { roomId } });
        io.to(roomId).emit('chat-cleared', {});
        emitSystem(io, roomId, `${getUsername()} limpió el chat`);
        if (typeof ack === 'function') ack({ ok: true });
      } catch (err: any) {
        logger.error({ err }, 'clear-chat failed');
        if (typeof ack === 'function') ack({ error: 'internal' });
      }
    });

    // ── set-room-settings (tema compartido + toggles, solo host) ──
    socket.on('set-room-settings', async (data, ack) => {
      try {
        const { roomId, theme, chatEnabled, reactionsEnabled } = (data as any) || {};
        if (!roomId) return typeof ack === 'function' ? ack({ error: 'invalid' }) : undefined;
        if (!(await isController(roomId, userId ?? undefined))) return typeof ack === 'function' ? ack({ error: 'forbidden' }) : undefined;
        const patch: any = {};
        if (theme !== undefined) patch.theme = theme;
        if (chatEnabled !== undefined) patch.chatEnabled = chatEnabled;
        if (reactionsEnabled !== undefined) patch.reactionsEnabled = reactionsEnabled;
        const next = patchRoomSettings(roomId, patch);
        io.to(roomId).emit('room-settings-updated', next);
        if (typeof ack === 'function') ack({ ok: true, settings: next });
      } catch (err: any) {
        logger.error({ err }, 'set-room-settings failed');
        if (typeof ack === 'function') ack({ error: 'internal' });
      }
    });

    // ── disconnect ────────────────────────────────────────
    socket.on('disconnect', async () => {
      logger.info({ id: socket.id }, 'socket disconnected');

      if (userId) redis.srem(`presence:${userId}`, socket.id);
      clearRate(`msg:${userId || socket.id}`);
      clearRate(`vid:${socket.id}`);

      const currentRoom = (socket as any).data.currentRoom;
      if (currentRoom) {
        // doLeave ya limpia typing y anuncia la salida (una sola vez).
        await doLeave(currentRoom, true).catch(() => {});
      } else if (userId) {
        const rooms = await removeTypingEverywhere(userId);
        for (const r of rooms) io.to(r).emit('typing-update', { typingUserIds: [] });
      }
    });
  });

  fastify.addHook('onClose', async () => {
    io.close();
    try { await redis.quit(); } catch { /* ignorar */ }
  });

  fastify.decorate('io', io);
});
