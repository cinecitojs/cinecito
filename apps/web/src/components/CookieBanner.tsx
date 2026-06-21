// apps/web/src/components/CookieBanner.tsx
// Banner de consentimiento de cookies. Se muestra hasta que el usuario decide.
// No activa cookies opcionales sin consentimiento. Si el usuario está autenticado,
// registra la elección en el backend (best-effort, no bloquea).
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, Settings2 } from 'lucide-react';
import { useCookieConsent } from '../store/useCookieConsent';
import { useAuthStore } from '../store/useAuthStore';
import { legalApi } from '../lib/api';
import { Switch, Button } from './ui';

export default function CookieBanner() {
  const { decided, acceptAll, rejectOptional, save } = useCookieConsent();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [config, setConfig] = useState(false);
  const [prefs, setPrefs] = useState({ preferences: false, analytics: false });

  if (decided) return null;

  // Registro best-effort en backend (solo usuarios autenticados).
  const log = (preferences: boolean, analytics: boolean) => {
    if (!isAuthenticated) return;
    legalApi.recordConsent({ docType: 'cookies', accepted: preferences || analytics, detail: { preferences, analytics } })
      .catch(() => { /* best-effort */ });
  };

  const onAcceptAll = () => { acceptAll(); log(true, true); };
  const onReject    = () => { rejectOptional(); log(false, false); };
  const onSave      = () => { save(prefs); log(prefs.preferences, prefs.analytics); };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4 pointer-events-none">
      <div className="pointer-events-auto max-w-3xl mx-auto bg-surface dark:bg-dark-surface border border-[var(--border)] rounded-3xl shadow-2xl p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Cookie className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-sm">Usamos cookies para que Cinecito funcione</p>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
              Usamos almacenamiento <strong className="text-[var(--text)]">técnico necesario</strong> (sesión y preferencias).
              Las cookies <strong className="text-[var(--text)]">no esenciales</strong> solo se activan si las aceptás.
              No usamos publicidad ni seguimiento. Más info en la{' '}
              <Link to="/legal/cookies" className="text-primary hover:underline">Política de Cookies</Link>.
            </p>

            {config && (
              <div className="mt-3 rounded-2xl border border-[var(--border)] divide-y divide-[var(--border)]">
                <div className="flex items-center justify-between gap-4 p-3">
                  <div>
                    <p className="text-xs font-semibold">Necesarias</p>
                    <p className="text-[11px] text-[var(--text-muted)]">Imprescindibles. Siempre activas.</p>
                  </div>
                  <span className="text-[11px] font-semibold text-[var(--text-muted)]">Siempre activas</span>
                </div>
                <div className="flex items-center justify-between gap-4 p-3">
                  <div>
                    <p className="text-xs font-semibold">Preferencias</p>
                    <p className="text-[11px] text-[var(--text-muted)]">Recuerdan ajustes no esenciales.</p>
                  </div>
                  <Switch checked={prefs.preferences} onChange={(v) => setPrefs((p) => ({ ...p, preferences: v }))} label="Cookies de preferencias" />
                </div>
                <div className="flex items-center justify-between gap-4 p-3">
                  <div>
                    <p className="text-xs font-semibold">Medición / analítica</p>
                    <p className="text-[11px] text-[var(--text-muted)]">Uso agregado. Inactivas si no hay proveedor.</p>
                  </div>
                  <Switch checked={prefs.analytics} onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))} label="Cookies de analítica" />
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Button size="sm" onClick={onAcceptAll}>Aceptar todas</Button>
              <Button size="sm" variant="secondary" onClick={onReject}>Rechazar opcionales</Button>
              {config ? (
                <Button size="sm" variant="ghost" onClick={onSave}>Guardar preferencias</Button>
              ) : (
                <button onClick={() => setConfig(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-primary transition-colors px-2 py-1">
                  <Settings2 className="w-3.5 h-3.5" /> Configurar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
