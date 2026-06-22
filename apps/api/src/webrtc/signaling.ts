// ============================================================
// apps/api/src/webrtc/signaling.ts  — FASE 4
// Señalización WebRTC para voz grupal peer-to-peer (mesh)
// REEMPLAZA el archivo existente
// ============================================================

import { Server as IOServer, Socket } from 'socket.io';
import { logger } from '../lib/logger';
import { prisma } from '../lib/db';

// Estado de voz por sala: roomId → Map<socketId, VoiceParticipant>
interface VoiceParticipant {
  socketId: string;
  userId: string | null;
  username: string;
  muted: boolean;
  videoEnabled: boolean;
}

const voiceRooms = new Map<string, Map<string, VoiceParticipant>>();
// Usuarios en ESPERA por un cupo activo (cuando la sala está llena). roomId → Set<userId>.
const voiceWaiting = new Map<string, Set<string>>();

// ── ÚNICA fuente del límite de participantes ACTIVOS (en videollamada) por sala ──
// "Activo" = usa cámara/micrófono/videollamada y ocupa cupo. El resto de la sala
// (espectadores/chat/espera) NO consume cupo. Mesh P2P → 4 es el techo sano.
export const MAX_ACTIVE_PARTICIPANTS = 4;

function getVoiceRoom(roomId: string): Map<string, VoiceParticipant> {
  if (!voiceRooms.has(roomId)) voiceRooms.set(roomId, new Map());
  return voiceRooms.get(roomId)!;
}
function getWaiting(roomId: string): Set<string> {
  if (!voiceWaiting.has(roomId)) voiceWaiting.set(roomId, new Set());
  return voiceWaiting.get(roomId)!;
}

function participantsList(roomId: string): VoiceParticipant[] {
  return [...getVoiceRoom(roomId).values()];
}

// Estado de capacidad de la sala (se difunde a TODOS, activos y espectadores).
function voiceStatePayload(roomId: string) {
  const room = getVoiceRoom(roomId);
  const activeUserIds = [...room.values()].map((p) => p.userId).filter((id): id is string => !!id);
  return {
    active: room.size,
    max: MAX_ACTIVE_PARTICIPANTS,
    full: room.size >= MAX_ACTIVE_PARTICIPANTS,
    activeUserIds,
    waitingUserIds: [...getWaiting(roomId)],
  };
}
function broadcastVoiceState(io: IOServer, roomId: string) {
  io.to(roomId).emit('voice-room-state', voiceStatePayload(roomId));
}

// Tras salir un activo: si se liberó un cupo y hay gente esperando, avisamos a la
// sala; siempre re-difundimos el estado; limpiamos las estructuras si quedan vacías.
function releaseSlot(io: IOServer, roomId: string) {
  const room = getVoiceRoom(roomId);
  const waiting = getWaiting(roomId);
  if (room.size < MAX_ACTIVE_PARTICIPANTS && waiting.size > 0) {
    io.to(roomId).emit('voice-slot-free', { active: room.size, max: MAX_ACTIVE_PARTICIPANTS });
  }
  broadcastVoiceState(io, roomId);
  if (room.size === 0 && waiting.size === 0) { voiceRooms.delete(roomId); voiceWaiting.delete(roomId); }
}

export function attachSignaling(io: IOServer) {
  io.on('connection', (socket: Socket) => {

    const getUserData = () => ({
      userId:   (socket as any).data?.userId ?? null,
      username: (socket as any).data?.username ?? 'Invitado',
    });

    // ────────────────────────────────────────────────────────
    // voice-join — el usuario activa su micrófono y entra al canal de voz
    // ────────────────────────────────────────────────────────
    socket.on('voice-join', async (data, ack) => {
      try {
        const { roomId } = (data as any) || {};
        if (!roomId) {
          return typeof ack === 'function' && ack({ error: 'roomId required' });
        }

        const room = getVoiceRoom(roomId);

        // Límite ESTRICTO de activos (validado en servidor → no se puede saltar desde el front).
        if (room.size >= MAX_ACTIVE_PARTICIPANTS && !room.has(socket.id)) {
          return typeof ack === 'function' && ack({
            error: 'voice_full',
            max: MAX_ACTIVE_PARTICIPANTS,
            message: `La sala alcanzó el máximo de ${MAX_ACTIVE_PARTICIPANTS} participantes activos`,
          });
        }

        const { userId } = getUserData();
        let { username } = getUserData();
        // El nombre puede no haberse cargado aún en el socket → resolverlo de la DB.
        if (userId && (!username || username === 'Invitado')) {
          try {
            const u = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
            if (u?.username) username = u.username;
          } catch { /* ignorar */ }
        }
        // Estado inicial declarado por el cliente: si entra CON cámara, los demás
        // deben verla encendida desde el arranque (no solo tras un toggle posterior).
        const participant: VoiceParticipant = {
          socketId: socket.id,
          userId,
          username,
          muted: !!(data as any)?.muted,
          videoEnabled: !!(data as any)?.videoEnabled,
        };
        room.set(socket.id, participant);
        if (userId) getWaiting(roomId).delete(userId); // ya es activo → sale de la espera

        // El socket de la llamada (que puede ser uno DEDICADO, distinto al de la
        // sala) debe unirse al room para recibir los broadcasts de voz
        // (voice-user-joined/left, voice-state-update).
        socket.join(roomId);

        // Lista de los OTROS que ya están en voz (el nuevo crea ofertas hacia ellos)
        const existingPeers = participantsList(roomId).filter((p) => p.socketId !== socket.id);

        // Notificar a los demás que alguien se unió al canal de voz
        socket.to(roomId).emit('voice-user-joined', { participant });
        broadcastVoiceState(io, roomId); // actualiza "Activos X/4" en toda la sala

        logger.info({ roomId, socketId: socket.id }, 'voice-join');

        if (typeof ack === 'function') {
          ack({ ok: true, peers: existingPeers });
        }
      } catch (err: any) {
        logger.error({ err }, 'voice-join failed');
        if (typeof ack === 'function') ack({ error: 'internal' });
      }
    });

    // ────────────────────────────────────────────────────────
    // voice-leave — el usuario apaga su micrófono y sale del canal
    // ────────────────────────────────────────────────────────
    socket.on('voice-leave', (data) => {
      const { roomId } = (data as any) || {};
      if (!roomId) return;
      const room = getVoiceRoom(roomId);
      const { userId } = getUserData();
      if (userId) getWaiting(roomId).delete(userId);
      if (room.delete(socket.id)) {
        socket.to(roomId).emit('voice-user-left', { socketId: socket.id });
        socket.leave(roomId);
        releaseSlot(io, roomId); // avisa cupo libre + difunde estado
        logger.info({ roomId, socketId: socket.id }, 'voice-leave');
      } else {
        // No era activo pero pudo estar esperando → re-difundir si se quitó de la espera.
        broadcastVoiceState(io, roomId);
      }
    });

    // ────────────────────────────────────────────────────────
    // voice-wait / voice-unwait — entrar/salir de la lista de espera por un cupo
    // ────────────────────────────────────────────────────────
    socket.on('voice-wait', (data) => {
      const { roomId } = (data as any) || {};
      const { userId } = getUserData();
      if (!roomId || !userId) return;
      // Solo tiene sentido esperar si la sala está llena.
      if (getVoiceRoom(roomId).size >= MAX_ACTIVE_PARTICIPANTS) {
        getWaiting(roomId).add(userId);
        broadcastVoiceState(io, roomId);
      }
    });
    socket.on('voice-unwait', (data) => {
      const { roomId } = (data as any) || {};
      const { userId } = getUserData();
      if (!roomId || !userId) return;
      if (getWaiting(roomId).delete(userId)) broadcastVoiceState(io, roomId);
    });

    // ────────────────────────────────────────────────────────
    // WebRTC signaling: offer / answer / ICE candidates
    // Se reenvían directamente al socket destino (targetId)
    // ────────────────────────────────────────────────────────
    socket.on('webrtc-offer', (data) => {
      const { targetId, offer, roomId } = (data as any) || {};
      if (!targetId || !offer) return;
      io.to(targetId).emit('webrtc-offer', {
        from: socket.id,
        offer,
        roomId,
      });
    });

    socket.on('webrtc-answer', (data) => {
      const { targetId, answer } = (data as any) || {};
      if (!targetId || !answer) return;
      io.to(targetId).emit('webrtc-answer', {
        from: socket.id,
        answer,
      });
    });

    socket.on('webrtc-ice-candidate', (data) => {
      const { targetId, candidate } = (data as any) || {};
      if (!targetId || !candidate) return;
      io.to(targetId).emit('webrtc-ice-candidate', {
        from: socket.id,
        candidate,
      });
    });

    // ────────────────────────────────────────────────────────
    // voice-mute / voice-video-toggle — actualizar estado y notificar
    // ────────────────────────────────────────────────────────
    socket.on('voice-mute', (data) => {
      const { roomId, muted } = (data as any) || {};
      if (!roomId) return;
      const room = getVoiceRoom(roomId);
      const p = room.get(socket.id);
      if (p) {
        p.muted = !!muted;
        io.to(roomId).emit('voice-state-update', {
          socketId: socket.id,
          muted: p.muted,
          videoEnabled: p.videoEnabled,
        });
      }
    });

    socket.on('voice-video-toggle', (data) => {
      const { roomId, videoEnabled } = (data as any) || {};
      if (!roomId) return;
      const room = getVoiceRoom(roomId);
      const p = room.get(socket.id);
      if (p) {
        p.videoEnabled = !!videoEnabled;
        io.to(roomId).emit('voice-state-update', {
          socketId: socket.id,
          muted: p.muted,
          videoEnabled: p.videoEnabled,
        });
      }
    });

    // ────────────────────────────────────────────────────────
    // Compatibilidad: evento 'signal' genérico del proyecto original
    // ────────────────────────────────────────────────────────
    socket.on('signal', (data) => {
      const { to, payload } = (data as any) || {};
      if (to) socket.to(to).emit('signal', { from: socket.id, payload });
    });

    // ────────────────────────────────────────────────────────
    // Al desconectar: limpiar de todas las salas de voz
    // ────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const { userId } = getUserData();
      // Salir de toda lista de espera donde estuviera este usuario.
      if (userId) {
        for (const [roomId, waiting] of voiceWaiting) {
          if (waiting.delete(userId)) broadcastVoiceState(io, roomId);
        }
      }
      for (const [roomId, room] of voiceRooms) {
        if (room.delete(socket.id)) {
          socket.to(roomId).emit('voice-user-left', { socketId: socket.id });
          releaseSlot(io, roomId);
        }
      }
    });
  });
}
