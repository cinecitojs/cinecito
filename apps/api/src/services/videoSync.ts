// ============================================================
// apps/api/src/services/videoSync.ts  — FASE 1A
// Compensación de deriva de tiempo al reproducir
// ============================================================

import { FastifyInstance } from 'fastify';
import { setRoomSession, getRoomSession } from './roomSession';

export type VideoCommand =
  | { type: 'play';   seekTime?: number }
  | { type: 'pause';  seekTime?: number }
  | { type: 'seek';   seekTime?: number }
  | { type: 'select'; videoId?: string };

export async function applyVideoCommand(
  fastify: FastifyInstance,
  roomId: string,
  command: VideoCommand,
) {
  const existing = await getRoomSession(roomId);

  // ── Calcular el currentTime real ANTES de aplicar el comando ──
  // Si el video estaba reproduciendo, compensamos la deriva
  // sumando el tiempo transcurrido desde la última actualización.
  let resolvedCurrentTime = existing?.currentTime ?? 0;
  if (existing?.isPlaying) {
    const lastUpdate = new Date(existing.updatedAt).getTime();
    const elapsedSecs = (Date.now() - lastUpdate) / 1000;
    resolvedCurrentTime = existing.currentTime + elapsedSecs;
  }

  const patch: Partial<{
    isPlaying: boolean;
    currentTime: number;
    currentVideoId: string | null;
  }> = {};

  switch (command.type) {
    case 'play':
      patch.isPlaying = true;
      // Si el host especifica un seekTime, usar ese; si no, usar el calculado
      patch.currentTime = command.seekTime !== undefined ? command.seekTime : resolvedCurrentTime;
      break;

    case 'pause':
      patch.isPlaying = false;
      patch.currentTime = command.seekTime !== undefined ? command.seekTime : resolvedCurrentTime;
      break;

    case 'seek':
      // Seek mantiene el estado de reproducción, solo cambia la posición
      patch.currentTime = command.seekTime !== undefined ? command.seekTime : resolvedCurrentTime;
      // Si estaba reproduciendo, sigue reproduciendo desde el nuevo tiempo
      patch.isPlaying = existing?.isPlaying ?? false;
      break;

    case 'select':
      // Cambiar de video: resetear posición y pausar
      patch.currentVideoId = command.videoId ?? null;
      patch.currentTime = 0;
      patch.isPlaying = false;
      break;
  }

  const next = await setRoomSession(roomId, patch);

  // Emitir nuevo estado a toda la sala con el timestamp del servidor
  // Los clientes usan serverTime para compensar su latencia individual
  (fastify as any).io?.to(roomId).emit('room-state', {
    session: next,
    serverTime: Date.now(),
  });

  return next;
}
