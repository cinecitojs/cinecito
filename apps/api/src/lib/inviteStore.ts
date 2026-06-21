// ============================================================
// apps/api/src/lib/inviteStore.ts
// Invitaciones a salas (links/códigos) con expiración, límite de usos y
// revocación. Estado en memoria del proceso (patrón de roomSession/roomRuntime):
// evita un modelo Prisma nuevo (que requeriría regenerar el cliente) y alcanza
// para invitaciones, que son efímeras por naturaleza. Multi-instancia → Redis.
// ============================================================

import { randomBytes } from 'crypto';

export interface Invite {
  code: string;
  roomId: string;
  createdBy: string | null;
  createdAt: number;
  expiresAt: number | null; // epoch ms; null = no expira
  maxUses: number | null;   // null = ilimitado
  uses: number;
  revoked: boolean;
}

export type InviteReason = 'not_found' | 'revoked' | 'expired' | 'max_uses';

const byCode = new Map<string, Invite>();
const byRoom = new Map<string, Set<string>>();

// Alfabeto sin caracteres ambiguos (0/O, 1/I/L).
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function genCode(len = 8): string {
  const bytes = randomBytes(len);
  let code = '';
  for (let i = 0; i < len; i++) code += ALPHABET[bytes[i] % ALPHABET.length];
  return code;
}

export function createInvite(
  roomId: string,
  opts: { ttlSeconds?: number | null; maxUses?: number | null; createdBy?: string | null } = {},
): Invite {
  let code = genCode();
  while (byCode.has(code)) code = genCode();
  const now = Date.now();
  const invite: Invite = {
    code,
    roomId,
    createdBy: opts.createdBy ?? null,
    createdAt: now,
    expiresAt: opts.ttlSeconds ? now + opts.ttlSeconds * 1000 : null,
    maxUses: opts.maxUses && opts.maxUses > 0 ? opts.maxUses : null,
    uses: 0,
    revoked: false,
  };
  byCode.set(code, invite);
  if (!byRoom.has(roomId)) byRoom.set(roomId, new Set());
  byRoom.get(roomId)!.add(code);
  return invite;
}

export function inviteStatus(code: string): { invite: Invite | null; valid: boolean; reason?: InviteReason } {
  const inv = byCode.get((code || '').toUpperCase());
  if (!inv) return { invite: null, valid: false, reason: 'not_found' };
  if (inv.revoked) return { invite: inv, valid: false, reason: 'revoked' };
  if (inv.expiresAt && Date.now() > inv.expiresAt) return { invite: inv, valid: false, reason: 'expired' };
  if (inv.maxUses != null && inv.uses >= inv.maxUses) return { invite: inv, valid: false, reason: 'max_uses' };
  return { invite: inv, valid: true };
}

// Consume un uso (al aceptar la invitación). Devuelve la invitación o null si inválida.
export function consumeInvite(code: string): Invite | null {
  const { invite, valid } = inviteStatus(code);
  if (!valid || !invite) return null;
  invite.uses += 1;
  return invite;
}

export function revokeInvite(roomId: string, code: string): boolean {
  const inv = byCode.get((code || '').toUpperCase());
  if (!inv || inv.roomId !== roomId) return false;
  inv.revoked = true;
  return true;
}

export function listInvites(roomId: string): Invite[] {
  const codes = byRoom.get(roomId);
  if (!codes) return [];
  return [...codes]
    .map((c) => byCode.get(c))
    .filter((i): i is Invite => !!i)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function deleteRoomInvites(roomId: string): void {
  const codes = byRoom.get(roomId);
  if (codes) {
    for (const c of codes) byCode.delete(c);
    byRoom.delete(roomId);
  }
}
