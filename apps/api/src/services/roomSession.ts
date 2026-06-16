import { redis } from '../lib/redis';

export type RoomSession = {
  roomId: string;
  currentVideoId?: string | null;
  currentTime: number;
  isPlaying: boolean;
  version: number;
  updatedAt: string;
};

const keyFor = (roomId: string) => `room:${roomId}:session`;

export async function getRoomSession(roomId: string): Promise<RoomSession | null> {
  const raw = await redis.get(keyFor(roomId));
  if (!raw) return null;
  return JSON.parse(raw) as RoomSession;
}

export async function setRoomSession(roomId: string, session: Partial<RoomSession>) {
  const existing = (await getRoomSession(roomId)) || { roomId, currentTime: 0, isPlaying: false, version: 0, updatedAt: new Date().toISOString() };
  const next = { ...existing, ...session, version: (existing.version || 0) + 1, updatedAt: new Date().toISOString() };
  await redis.set(keyFor(roomId), JSON.stringify(next));
  return next;
}
