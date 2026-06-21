// ============================================================
// apps/api/src/lib/roomRuntime.ts
// Estado efímero de sala (typing + rate-limit) compartido entre
// instancias vía Redis cuando está disponible, con fallback a
// memoria local para entornos de una sola instancia / dev sin Redis.
// ============================================================

import { redis } from './redis';

// ── Typing indicators ───────────────────────────────────────
const TYPING_TTL_S = 8; // auto-expira si el cliente no manda typing-stop
const memTyping = new Map<string, Map<string, number>>(); // roomId → (userId → expiresAt)

const typingKey = (roomId: string) => `room:${roomId}:typing`;

function memTypingSet(roomId: string) {
  if (!memTyping.has(roomId)) memTyping.set(roomId, new Map());
  return memTyping.get(roomId)!;
}

function memTypingActive(roomId: string): string[] {
  const set = memTyping.get(roomId);
  if (!set) return [];
  const now = Date.now();
  for (const [uid, exp] of set) if (exp < now) set.delete(uid);
  return [...set.keys()];
}

export async function addTyping(roomId: string, userId: string): Promise<string[]> {
  if (redis.live) {
    // ZSET por score=expiración sería ideal; con SafeRedis usamos set + TTL global.
    await redis.sadd(typingKey(roomId), userId);
    await redis.expire(typingKey(roomId), TYPING_TTL_S);
    return redis.smembers(typingKey(roomId));
  }
  memTypingSet(roomId).set(userId, Date.now() + TYPING_TTL_S * 1000);
  return memTypingActive(roomId);
}

export async function removeTyping(roomId: string, userId: string): Promise<string[]> {
  if (redis.live) {
    await redis.srem(typingKey(roomId), userId);
    return redis.smembers(typingKey(roomId));
  }
  memTypingSet(roomId).delete(userId);
  return memTypingActive(roomId);
}

export async function removeTypingEverywhere(userId: string): Promise<string[]> {
  // Devuelve los roomIds (en memoria) de los que se removió, para reemitir.
  const affected: string[] = [];
  for (const [roomId, set] of memTyping) {
    if (set.delete(userId)) affected.push(roomId);
  }
  return affected;
}

// ── Rate limiting por acción (sliding-ish window) ───────────
const memRate = new Map<string, { count: number; resetAt: number }>();

/**
 * Devuelve true si la acción está permitida (bajo el límite).
 * key debe ser único por (usuario|socket, acción).
 */
export async function checkRate(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (redis.live) {
    const k = `rl:${key}`;
    const count = await redis.incr(k);
    if (count === 1) await redis.pexpire(k, windowMs);
    return count <= limit;
  }
  const now = Date.now();
  const entry = memRate.get(key);
  if (!entry || now > entry.resetAt) {
    memRate.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

export function clearRate(key: string) {
  memRate.delete(key);
}
