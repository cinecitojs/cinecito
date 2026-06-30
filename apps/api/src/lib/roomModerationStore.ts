// ============================================================
// apps/api/src/lib/roomModerationStore.ts
// Estado de MODERACIÓN y AJUSTES de sala en MEMORIA del proceso.
// No usa DB → no requiere migración (mismo patrón que joinRequestStore /
// reactionStore / typing). Se reinicia con el proceso: aceptable para estado
// de moderación de sesiones en vivo y ajustes cosméticos.
// ============================================================

export interface RoomSettings {
  theme: string | null;        // ambientación compartida (id de roomThemes) o null
  chatEnabled: boolean;        // chat habilitado para no-hosts
  reactionsEnabled: boolean;   // reacciones flotantes habilitadas
}

const DEFAULT_SETTINGS: RoomSettings = { theme: null, chatEnabled: true, reactionsEnabled: true };

const mutes    = new Map<string, Set<string>>();          // roomId → userIds silenciados
const bans     = new Map<string, Map<string, number>>();  // roomId → (userId → expira en ms epoch)
const settings = new Map<string, RoomSettings>();         // roomId → ajustes

// ── Silenciar ────────────────────────────────────────────────
export function isMuted(roomId: string, userId?: string | null): boolean {
  return !!userId && (mutes.get(roomId)?.has(userId) ?? false);
}
export function setMuted(roomId: string, userId: string, muted: boolean): void {
  let set = mutes.get(roomId);
  if (!set) { set = new Set(); mutes.set(roomId, set); }
  if (muted) set.add(userId); else set.delete(userId);
}
export function listMuted(roomId: string): string[] {
  return [...(mutes.get(roomId) ?? [])];
}

// ── Baneo temporal (expulsar + bloquear reingreso) ───────────
export function isBanned(roomId: string, userId?: string | null): { banned: boolean; until?: number } {
  if (!userId) return { banned: false };
  const m = bans.get(roomId);
  const until = m?.get(userId);
  if (!until) return { banned: false };
  if (Date.now() >= until) { m!.delete(userId); return { banned: false }; }
  return { banned: true, until };
}
export function setBan(roomId: string, userId: string, minutes: number): number {
  let m = bans.get(roomId);
  if (!m) { m = new Map(); bans.set(roomId, m); }
  const until = Date.now() + minutes * 60_000;
  m.set(userId, until);
  return until;
}

// ── Ajustes de sala ──────────────────────────────────────────
export function getRoomSettings(roomId: string): RoomSettings {
  return { ...DEFAULT_SETTINGS, ...(settings.get(roomId) ?? {}) };
}

// ── Snapshot global (para el panel admin) ────────────────────
export function moderationSnapshot() {
  let mutedTotal = 0;
  for (const set of mutes.values()) mutedTotal += set.size;
  let bannedTotal = 0;
  const now = Date.now();
  for (const m of bans.values()) for (const until of m.values()) if (until > now) bannedTotal++;
  return { mutedTotal, bannedTotal, themedRooms: settings.size };
}
export function patchRoomSettings(roomId: string, patch: Partial<RoomSettings>): RoomSettings {
  const next = { ...getRoomSettings(roomId), ...patch };
  next.chatEnabled = !!next.chatEnabled;
  next.reactionsEnabled = !!next.reactionsEnabled;
  next.theme = typeof next.theme === 'string' && next.theme ? next.theme.slice(0, 40) : null;
  settings.set(roomId, next);
  return next;
}
