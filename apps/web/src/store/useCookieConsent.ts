// apps/web/src/store/useCookieConsent.ts
// Consentimiento de cookies REAL, persistido en localStorage. Las cookies técnicas
// (necessary) son siempre true. Las opcionales (preferences/analytics) solo se activan
// si el usuario las acepta. Hoy no hay scripts no esenciales: el estado se respeta y
// queda listo para cuando se incorporen (no se carga nada opcional sin consentimiento).
import { create } from 'zustand';

export const COOKIE_POLICY_VERSION = '1.0';
const LS = 'cinecito_cookie_consent';

export interface CookieConsent {
  decided: boolean;        // ¿el usuario ya eligió?
  necessary: boolean;      // siempre true
  preferences: boolean;    // opcional
  analytics: boolean;      // opcional
  decidedAt: string | null;
  version: string;
}

const DEFAULTS: CookieConsent = {
  decided: false,
  necessary: true,
  preferences: false,
  analytics: false,
  decidedAt: null,
  version: COOKIE_POLICY_VERSION,
};

function load(): CookieConsent {
  try {
    const raw = localStorage.getItem(LS);
    if (raw) {
      const parsed = { ...DEFAULTS, ...JSON.parse(raw) };
      // Si cambió la versión de la política, re-pedir consentimiento.
      if (parsed.version !== COOKIE_POLICY_VERSION) return DEFAULTS;
      return parsed;
    }
  } catch { /* */ }
  return DEFAULTS;
}

interface CookieStore extends CookieConsent {
  acceptAll: () => void;
  rejectOptional: () => void;
  save: (opts: { preferences: boolean; analytics: boolean }) => void;
  reopen: () => void; // volver a mostrar el banner (revocar / reconfigurar)
}

export const useCookieConsent = create<CookieStore>((set, get) => {
  const persist = (c: CookieConsent) => {
    try { localStorage.setItem(LS, JSON.stringify(c)); } catch { /* */ }
  };
  return {
    ...load(),
    acceptAll: () => {
      const c: CookieConsent = { decided: true, necessary: true, preferences: true, analytics: true, decidedAt: new Date().toISOString(), version: COOKIE_POLICY_VERSION };
      persist(c); set(c);
    },
    rejectOptional: () => {
      const c: CookieConsent = { decided: true, necessary: true, preferences: false, analytics: false, decidedAt: new Date().toISOString(), version: COOKIE_POLICY_VERSION };
      persist(c); set(c);
    },
    save: ({ preferences, analytics }) => {
      const c: CookieConsent = { decided: true, necessary: true, preferences, analytics, decidedAt: new Date().toISOString(), version: COOKIE_POLICY_VERSION };
      persist(c); set(c);
    },
    reopen: () => set({ decided: false }),
  };
});

export const getCookieConsent = (): CookieConsent => {
  const s = useCookieConsent.getState();
  return { decided: s.decided, necessary: s.necessary, preferences: s.preferences, analytics: s.analytics, decidedAt: s.decidedAt, version: s.version };
};
