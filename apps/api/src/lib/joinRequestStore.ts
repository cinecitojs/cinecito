// ============================================================
// apps/api/src/lib/joinRequestStore.ts
// Solicitudes de acceso a salas "Solo invitación". Estado en memoria del proceso
// (mismo criterio que inviteStore/roomRuntime): las solicitudes son efímeras y
// viven mientras el host está en sesión; evita un modelo Prisma nuevo. Para
// durabilidad/auditoría a futuro → tabla RoomJoinRequest. Multi-instancia → Redis.
// ============================================================

export type JoinRequestStatus = 'pending' | 'accepted' | 'rejected' | 'ignored';

export interface JoinRequest {
  roomId: string;
  userId: string;
  username: string;
  avatar: string | null;
  status: JoinRequestStatus;
  createdAt: number;
  updatedAt: number;
}

// roomId → (userId → request). Una sola solicitud por (sala, usuario) → evita duplicados/spam.
const byRoom = new Map<string, Map<string, JoinRequest>>();

function roomMap(roomId: string): Map<string, JoinRequest> {
  let m = byRoom.get(roomId);
  if (!m) { m = new Map(); byRoom.set(roomId, m); }
  return m;
}

// Crea (o devuelve) la solicitud del usuario en la sala. NO crea duplicados:
// si ya existe (cualquier estado), devuelve la existente → sin reintentos infinitos.
export function createOrGetRequest(
  roomId: string,
  user: { userId: string; username: string; avatar?: string | null },
): { request: JoinRequest; isNew: boolean } {
  const m = roomMap(roomId);
  const existing = m.get(user.userId);
  if (existing) return { request: existing, isNew: false };
  const now = Date.now();
  const req: JoinRequest = {
    roomId, userId: user.userId, username: user.username, avatar: user.avatar ?? null,
    status: 'pending', createdAt: now, updatedAt: now,
  };
  m.set(user.userId, req);
  return { request: req, isNew: true };
}

export function getRequest(roomId: string, userId: string): JoinRequest | null {
  return byRoom.get(roomId)?.get(userId) ?? null;
}

export function setRequestStatus(roomId: string, userId: string, status: JoinRequestStatus): JoinRequest | null {
  const req = byRoom.get(roomId)?.get(userId);
  if (!req) return null;
  req.status = status;
  req.updatedAt = Date.now();
  return req;
}

// Lista para la bandeja del host. Por defecto, solo las accionables (pendiente/ignorada);
// con `all` también las resueltas (aceptada/rechazada).
export function listRequests(roomId: string, all = false): JoinRequest[] {
  const m = byRoom.get(roomId);
  if (!m) return [];
  return [...m.values()]
    .filter((r) => all || r.status === 'pending' || r.status === 'ignored')
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function pendingCount(roomId: string): number {
  const m = byRoom.get(roomId);
  if (!m) return 0;
  let n = 0;
  for (const r of m.values()) if (r.status === 'pending') n++;
  return n;
}

export function deleteRoomRequests(roomId: string): void {
  byRoom.delete(roomId);
}
