// ============================================================
// apps/web/src/lib/sync.ts
// Matemática pura de sincronización (sin React) para poder testearla.
// ============================================================

export interface SyncState {
  currentTime: number;   // posición (s) en el momento updatedAt
  isPlaying: boolean;
  updatedAt: string;     // ISO del servidor
}

// Posición objetivo en el reproductor dado el estado autoritativo y el "ahora" del servidor.
export function computeTargetTime(session: SyncState | null, serverNowMs: number): number | null {
  if (!session) return null;
  if (!session.isPlaying) return Math.max(0, session.currentTime);
  const elapsed = (serverNowMs - new Date(session.updatedAt).getTime()) / 1000;
  return Math.max(0, session.currentTime + elapsed);
}

export type DriftAction =
  | { kind: 'seek'; rate: 1 }
  | { kind: 'rate'; rate: number }
  | { kind: 'ok'; rate: 1 };

export const HARD_SEEK = 1.0;
export const SOFT_DRIFT = 0.3;

// Decide cómo corregir la deriva entre la posición actual y la objetivo.
export function resolveDrift(target: number, actual: number): DriftAction {
  const diff = target - actual;
  if (Math.abs(diff) > HARD_SEEK) return { kind: 'seek', rate: 1 };
  if (Math.abs(diff) > SOFT_DRIFT) return { kind: 'rate', rate: diff > 0 ? 1.05 : 0.95 };
  return { kind: 'ok', rate: 1 };
}
