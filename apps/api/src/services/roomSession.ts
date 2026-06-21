// ============================================================
// apps/api/src/services/roomSession.ts
// Estado de reproducción de la sala (video activo + tiempo + play/pause).
// HÍBRIDO: usa Redis cuando hay una conexión real; si no, persiste en
// memoria del proceso. Antes guardaba SOLO en Redis y, sin REDIS_URL, el
// stub no persistía nada → getRoomSession devolvía null y cada comando
// perdía `currentVideoId` (el video "desaparecía" al presionar Play).
// ============================================================

import { redis } from '../lib/redis';

export type RoomSession = {
  roomId: string;
  currentVideoId?: string | null;
  currentTime: number;
  isPlaying: boolean;
  version: number;
  updatedAt: string;
};

// TTL de 24 horas: si nadie usa la sala, el estado expira automáticamente (Redis).
const SESSION_TTL_SECONDS = 60 * 60 * 24;
const keyFor = (roomId: string) => `room:${roomId}:session`;

// Fallback en memoria para entornos de una sola instancia / sin Redis.
const memStore = new Map<string, RoomSession>();

export async function getRoomSession(roomId: string): Promise<RoomSession | null> {
  if (redis.live) {
    const raw = await redis.get(keyFor(roomId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as RoomSession;
    } catch {
      return null;
    }
  }
  return memStore.get(roomId) ?? null;
}

export async function setRoomSession(
  roomId: string,
  patch: Partial<RoomSession>,
): Promise<RoomSession> {
  const existing = (await getRoomSession(roomId)) || {
    roomId,
    currentTime: 0,
    isPlaying: false,
    version: 0,
    updatedAt: new Date().toISOString(),
  };

  const next: RoomSession = {
    ...existing,
    ...patch,
    roomId, // siempre preservar el roomId original
    version: (existing.version || 0) + 1,
    updatedAt: new Date().toISOString(),
  };

  if (redis.live) {
    await redis.setex(keyFor(roomId), SESSION_TTL_SECONDS, JSON.stringify(next));
  } else {
    memStore.set(roomId, next);
  }

  return next;
}

export async function deleteRoomSession(roomId: string): Promise<void> {
  memStore.delete(roomId);
  if (redis.live) await redis.del(keyFor(roomId));
}
