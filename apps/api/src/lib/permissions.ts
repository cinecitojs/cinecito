// ============================================================
// apps/api/src/lib/permissions.ts
// Modelo de permisos y de "host/controlador" unificado.
//
// Conceptos:
//  - OWNER       : creó la sala (room.ownerId). Puede borrar la sala,
//                  cambiar permisos y siempre puede controlar el video.
//  - CONTROLLER  : quién maneja la reproducción ahora mismo. Por defecto
//                  es el owner; se puede transferir a un miembro
//                  (RoomMember.isHost = true). Única fuente de verdad.
//  - PERMISOS    : por acción, "host" (solo el controlador/owner) o
//                  "everyone" (cualquier miembro de la sala).
// ============================================================

import { prisma } from './db';

export type VideoAction = 'addVideo' | 'removeVideo' | 'skip' | 'pauseResume' | 'seek';

export type RoomPermissions = Record<VideoAction, 'host' | 'everyone'>;

// Defaults colaborativos para la REPRODUCCIÓN: cualquiera en la sala puede
// play/pausa/seek y todos se sincronizan ("cuando alguien reproduce, todos
// reproducen"). La gestión de la COLA (agregar/quitar/saltar) queda en el host
// por defecto. El host puede ajustar todo esto en el panel de permisos.
export const DEFAULT_PERMISSIONS: RoomPermissions = {
  addVideo: 'host',
  removeVideo: 'host',
  skip: 'host',
  pauseResume: 'everyone',
  seek: 'everyone',
};

export function normalizePermissions(raw: unknown): RoomPermissions {
  const out: RoomPermissions = { ...DEFAULT_PERMISSIONS };
  if (raw && typeof raw === 'object') {
    for (const key of Object.keys(DEFAULT_PERMISSIONS) as VideoAction[]) {
      const v = (raw as any)[key];
      if (v === 'everyone' || v === 'host') out[key] = v;
    }
  }
  return out;
}

// ── Caché en proceso para no golpear la DB en cada evento de video ──
interface RoomControlState {
  ownerId: string | null;
  controllerUserId: string | null;
  permissions: RoomPermissions;
  fetchedAt: number;
}

const CACHE_TTL_MS = 5000;
const cache = new Map<string, RoomControlState>();

export function invalidateRoomControl(roomId: string) {
  cache.delete(roomId);
}

async function loadRoomControl(roomId: string): Promise<RoomControlState | null> {
  const cached = cache.get(roomId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached;

  // Lectura defensiva de la sala. Si el cliente Prisma está desincronizado con
  // el esquema (p.ej. la columna `permissions` todavía no existe en el cliente
  // generado), NO debemos romper el ingreso a la sala: degradamos a permisos
  // por defecto leyendo solo lo imprescindible (ownerId).
  let ownerId: string | null = null;
  let rawPermissions: unknown = null;
  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { ownerId: true, permissions: true },
    });
    if (!room) return null;
    ownerId = room.ownerId;
    rawPermissions = (room as any).permissions ?? null;
  } catch {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { ownerId: true },
    });
    if (!room) return null;
    ownerId = room.ownerId;
    rawPermissions = null; // sin info de permisos → defaults seguros
  }

  // Controlador = miembro con isHost; si no hay, el owner.
  const hostMember = await prisma.roomMember.findFirst({
    where: { roomId, isHost: true },
    select: { userId: true },
  });

  const state: RoomControlState = {
    ownerId,
    controllerUserId: hostMember?.userId ?? ownerId,
    permissions: normalizePermissions(rawPermissions),
    fetchedAt: Date.now(),
  };
  cache.set(roomId, state);
  return state;
}

export async function getRoomControl(roomId: string) {
  return loadRoomControl(roomId);
}

// ¿Es el controlador actual (o el owner) de la sala?
export async function isController(roomId: string, userId?: string | null): Promise<boolean> {
  if (!userId) return false;
  const state = await loadRoomControl(roomId);
  if (!state) return false;
  return state.controllerUserId === userId || state.ownerId === userId;
}

// ¿Puede el usuario ejecutar esta acción de video?
// `opts.inRoom` = el socket ya está unido a la sala (prueba fehaciente de que el
// usuario está adentro). En modo colaborativo eso basta: "everyone" significa
// "cualquiera presente en la sala", sin depender de una fila RoomMember (que en
// salas públicas puede quedar anónima).
export async function canDoVideoAction(
  roomId: string,
  userId: string | null | undefined,
  action: VideoAction,
  opts: { inRoom?: boolean } = {},
): Promise<boolean> {
  const state = await loadRoomControl(roomId);
  if (!state) return false;

  // Owner y controlador siempre pueden.
  if (userId && (state.controllerUserId === userId || state.ownerId === userId)) return true;

  // Modo colaborativo: cualquiera presente en la sala.
  if (state.permissions[action] === 'everyone') {
    if (opts.inRoom) return true;
    if (!userId) return false;
    const member = await prisma.roomMember.findFirst({ where: { roomId, userId }, select: { id: true } });
    return !!member || state.ownerId === userId;
  }
  return false;
}
