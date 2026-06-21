// ============================================================
// apps/api/src/lib/reactionStore.ts
// Reacciones emoji por mensaje, en memoria del proceso (realtime). Igual que
// roomSession/inviteStore: evita un modelo Prisma nuevo (regenerar el cliente
// está trabado en Windows). Las reacciones sobreviven mientras el server corre;
// para durabilidad total habría que persistirlas en DB (columna nueva en Message).
// ============================================================

// messageId → (emoji → Set<userId>)
const store = new Map<string, Map<string, Set<string>>>();

export type ReactionSummary = Record<string, string[]>; // emoji → userIds

export function summarize(messageId: string): ReactionSummary {
  const m = store.get(messageId);
  if (!m) return {};
  const out: ReactionSummary = {};
  for (const [emoji, set] of m) out[emoji] = [...set];
  return out;
}

// Alterna la reacción del usuario para (mensaje, emoji). Devuelve el resumen.
export function toggleReaction(messageId: string, emoji: string, userId: string): ReactionSummary {
  let m = store.get(messageId);
  if (!m) { m = new Map(); store.set(messageId, m); }
  let set = m.get(emoji);
  if (!set) { set = new Set(); m.set(emoji, set); }
  if (set.has(userId)) {
    set.delete(userId);
    if (set.size === 0) m.delete(emoji);
  } else {
    set.add(userId);
  }
  if (m.size === 0) store.delete(messageId);
  return summarize(messageId);
}

// Adjunta el resumen de reacciones a una lista de mensajes (para el historial inicial).
export function attachReactions<T extends { id: string }>(messages: T[]): (T & { reactions: ReactionSummary })[] {
  return messages.map((msg) => ({ ...msg, reactions: summarize(msg.id) }));
}
