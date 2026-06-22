// apps/web/src/lib/sentry.ts
// Inicialización de Sentry para el FRONTEND. Se importa dinámicamente y SOLO se llama
// si hay VITE_SENTRY_DSN (ver main.tsx) → en desarrollo o sin DSN, @sentry/react ni
// siquiera entra al bundle. Tras iniciar, conecta el captador con errorReporter.
import { setErrorCapture } from './errorReporter';

let started = false;

export async function initSentry(): Promise<void> {
  if (started) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  started = true;
  try {
    const Sentry = await import('@sentry/react');
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      // Solo errores; sin performance tracing para no agregar ruido ni costo.
      tracesSampleRate: 0,
      // Filtra ruido típico que no es accionable.
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications.',
        'Non-Error promise rejection captured',
      ],
    });
    setErrorCapture((error, context) => {
      Sentry.captureException(error, context ? { extra: context } : undefined);
    });
  } catch {
    started = false; // permitir reintento si la carga falló
  }
}
