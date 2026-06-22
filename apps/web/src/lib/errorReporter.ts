// apps/web/src/lib/errorReporter.ts
// Punto único para reportar errores. Siempre loguea a consola; si Sentry está
// inicializado (solo en prod con DSN), también lo captura. Mantiene a Sentry FUERA
// del bundle principal: si no hay DSN, este módulo no carga nada pesado.

type Capture = (error: unknown, context?: Record<string, unknown>) => void;

let _capture: Capture | null = null;

/** Lo setea lib/sentry.ts cuando Sentry se inicializa. */
export function setErrorCapture(fn: Capture | null): void {
  _capture = fn;
}

/** Reporta un error: consola siempre, Sentry si está disponible. Nunca lanza. */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  try {
    // eslint-disable-next-line no-console
    console.error('[cinecito] error capturado:', error, context ?? '');
  } catch { /* */ }
  try { _capture?.(error, context); } catch { /* el reporte no debe romper nada */ }
}
