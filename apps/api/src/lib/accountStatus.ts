// ============================================================
// apps/api/src/lib/accountStatus.ts
// Enforcement de moderación compartido (login HTTP + conexión de socket).
// Devuelve el motivo de bloqueo si la cuenta NO puede operar, o null si está activa.
// Una suspensión temporal vencida (suspendedUntil pasado) se considera levantada.
// ============================================================

export interface ModeratableUser {
  status?: string | null;
  statusReason?: string | null;
  suspendedUntil?: Date | null;
}

export function accountBlockReason(user: ModeratableUser): string | null {
  const status = user.status ?? 'active';
  if (status === 'deleted') return 'Esta cuenta fue eliminada.';
  if (status === 'blocked') return user.statusReason || 'Esta cuenta está bloqueada. Contactá con soporte.';
  if (status === 'suspended') {
    if (user.suspendedUntil && user.suspendedUntil.getTime() <= Date.now()) return null; // suspensión vencida
    const until = user.suspendedUntil ? ` hasta ${user.suspendedUntil.toLocaleString('es-AR')}` : '';
    return `${user.statusReason || 'Tu cuenta está suspendida'}${until}.`;
  }
  return null;
}
