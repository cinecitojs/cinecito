// apps/web/src/store/useSettings.ts
// Preferencias del usuario persistidas en localStorage. Todas REALES y con efecto:
// - reduceMotion: clase en <html> que desactiva animaciones (CSS).
// - micDeviceId / camDeviceId: dispositivo preferido, usado por la llamada/lobby.
// - notifyMessages: avisos del navegador de mensajes nuevos (con permiso real).
import { create } from 'zustand';

const LS = 'cinecito_settings';

export interface Settings {
  reduceMotion: boolean;
  micDeviceId: string;   // '' = predeterminado del sistema
  camDeviceId: string;
  notifyMessages: boolean;
}

const DEFAULTS: Settings = {
  reduceMotion: false,
  micDeviceId: '',
  camDeviceId: '',
  notifyMessages: false,
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(LS);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* */ }
  return DEFAULTS;
}

export function applyReduceMotion(on: boolean) {
  if (typeof document !== 'undefined') document.documentElement.classList.toggle('reduce-motion', on);
}

interface SettingsStore extends Settings {
  update: (patch: Partial<Settings>) => void;
}

export const useSettings = create<SettingsStore>((set, get) => {
  const initial = load();
  // Aplicar al iniciar (antes del primer render que importe).
  applyReduceMotion(initial.reduceMotion);

  return {
    ...initial,
    update: (patch) => {
      const next = { ...get(), ...patch };
      const data: Settings = {
        reduceMotion: next.reduceMotion,
        micDeviceId: next.micDeviceId,
        camDeviceId: next.camDeviceId,
        notifyMessages: next.notifyMessages,
      };
      try { localStorage.setItem(LS, JSON.stringify(data)); } catch { /* */ }
      if ('reduceMotion' in patch) applyReduceMotion(next.reduceMotion);
      set(patch);
    },
  };
});

// Lectura no reactiva (para usar fuera de React: constraints de getUserMedia, etc.)
export const getSettings = (): Settings => {
  const s = useSettings.getState();
  return { reduceMotion: s.reduceMotion, micDeviceId: s.micDeviceId, camDeviceId: s.camDeviceId, notifyMessages: s.notifyMessages };
};
