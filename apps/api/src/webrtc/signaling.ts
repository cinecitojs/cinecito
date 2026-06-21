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

// Límite recomendado para mesh P2P (cada par se conecta con todos)
const MAX_VOICE_PARTICIPANTS = 6;

function getVoiceRoom(roomId: string): Map<string, VoiceParticipant> {
  if (!voiceRooms.has(roomId)) voiceRooms.set(roomId, new Map());
  return voiceRooms.get(roomId)!;
}

function participantsList(roomId: string): VoiceParticipant[] {
  return [...getVoiceRoom(roomId).values()];
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

        // Verificar límite de participantes
        if (room.size >= MAX_VOICE_PARTICIPANTS && !room.has(socket.id)) {
          return typeof ack === 'function' && ack({
            error: 'voice_full',
            message: `Máximo ${MAX_VOICE_PARTICIPANTS} participantes en voz`,
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
        const participant: VoiceParticipant = {
          socketId: socket.id,
          userId,
          username,
          muted: false,
          videoEnabled: false,
        };
        room.set(socket.id, participant);

        // El socket de la llamada (que puede ser uno DEDICADO, distinto al de la
        // sala) debe unirse al room para recibir los broadcasts de voz
        // (voice-user-joined/left, voice-state-update).
        socket.join(roomId);

        // Lista de los OTROS que ya están en voz (el nuevo crea ofertas hacia ellos)
        const existingPeers = participantsList(roomId).filter((p) => p.socketId !== socket.id);

        // Notificar a los demás que alguien se unió al canal de voz
        socket.to(roomId).emit('voice-user-joined', { participant });

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
      if (room.delete(socket.id)) {
        socket.to(roomId).emit('voice-user-left', { socketId: socket.id });
        socket.leave(roomId);
        if (room.size === 0) voiceRooms.delete(roomId);
        logger.info({ roomId, socketId: socket.id }, 'voice-leave');
      }
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
      for (const [roomId, room] of voiceRooms) {
        if (room.delete(socket.id)) {
          socket.to(roomId).emit('voice-user-left', { socketId: socket.id });
          if (room.size === 0) voiceRooms.delete(roomId);
        }
      }
    });
  });
}
