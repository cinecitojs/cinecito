// apps/web/src/components/ErrorBoundary.tsx
// Captura errores de render de React para que un fallo NO deje la pantalla en blanco.
// Muestra un fallback amable (dark/light vía tokens) con recargar / volver al inicio,
// y reporta el error (consola + Sentry si está configurado). Debe ser class component
// (getDerivedStateFromError / componentDidCatch no tienen equivalente en hooks).
import React from 'react';
import { reportError } from '../lib/errorReporter';

interface Props {
  children: React.ReactNode;
  /** Etiqueta del área (para el log/Sentry), ej. "room", "app". */
  scope?: string;
  /** Compacto = encaja dentro de una sección (no pantalla completa). */
  compact?: boolean;
  /** A dónde lleva "volver" (default /home). */
  homeHref?: string;
}
interface State { hasError: boolean }

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    reportError(error, { scope: this.props.scope ?? 'app', componentStack: info.componentStack });
  }

  private reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;

    const compact = this.props.compact;
    const homeHref = this.props.homeHref ?? '/home';

    return (
      <div
        className={`flex flex-col items-center justify-center gap-4 text-center px-6 ${
          compact ? 'py-10' : 'min-h-[100dvh]'
        } bg-[var(--bg)] dark:bg-dark-bg text-[var(--text)]`}
        role="alert"
      >
        <img src="/pocine-empty.png?v=20260622" alt="" aria-hidden="true"
          className={`${compact ? 'w-24' : 'w-36'} h-auto select-none`} draggable={false} />
        <div className="max-w-sm">
          <h1 className="font-display font-bold text-xl">Uy, algo se rompió</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1 leading-relaxed">
            Tuvimos un problema al mostrar esta parte. No es tu culpa — ya quedó registrado.
            Probá recargar; si sigue, volvé al inicio.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-primary-dark transition-colors">
            Recargar
          </button>
          {/* reset intenta re-renderizar sin recargar (útil si fue transitorio) */}
          <button onClick={this.reset}
            className="px-4 py-2 rounded-2xl border-2 border-[var(--border)] font-semibold text-sm hover:border-primary transition-colors">
            Reintentar
          </button>
          <a href={homeHref}
            className="px-4 py-2 rounded-2xl border-2 border-[var(--border)] font-semibold text-sm hover:border-primary transition-colors">
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }
}
