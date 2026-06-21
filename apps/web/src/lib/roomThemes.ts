// apps/web/src/lib/roomThemes.ts
// Temas DECORATIVOS para salas (recompensa cosmética). Solo afectan un fondo decorativo
// detrás del contenido (pointer-events:none, sutil) — nunca la funcionalidad de la sala.
// minTier: 2=colaborador, 3=patrocinador. El componente RoomThemeBackdrop interpreta `decor`.
import { Clapperboard, Popcorn, Zap, Stars, Projector, type LucideIcon } from 'lucide-react';

export type ThemeDecor = 'curtain' | 'popcorn' | 'neon' | 'stars' | 'scanlines';

export interface RoomTheme {
  id: string;
  name: string;
  minTier: number;
  description: string;
  icon: LucideIcon;
  swatch: string;     // gradiente para la previsualización (tailwind)
  decor: ThemeDecor;
}

export const ROOM_THEMES: RoomTheme[] = [
  { id: 'cine-clasico',      name: 'Cine clásico',     minTier: 3, description: 'Telón rojo y luces cálidas.',        icon: Clapperboard, swatch: 'from-red-700 via-rose-600 to-amber-500',   decor: 'curtain' },
  { id: 'palomitas',         name: 'Palomitas',        minTier: 3, description: 'Lluvia suave de palomitas.',          icon: Popcorn,      swatch: 'from-amber-300 via-yellow-200 to-orange-300', decor: 'popcorn' },
  { id: 'neon',              name: 'Neón',             minTier: 3, description: 'Resplandor neón retro.',              icon: Zap,          swatch: 'from-fuchsia-500 via-purple-500 to-cyan-400', decor: 'neon' },
  { id: 'noche-estrellada',  name: 'Noche estrellada', minTier: 3, description: 'Cielo con estrellas titilantes.',     icon: Stars,        swatch: 'from-indigo-900 via-violet-800 to-blue-900', decor: 'stars' },
  { id: 'proyector-vintage', name: 'Proyector vintage',minTier: 3, description: 'Grano de película y líneas suaves.',  icon: Projector,    swatch: 'from-stone-600 via-amber-700 to-stone-800', decor: 'scanlines' },
];

export const THEME_BY_ID: Record<string, RoomTheme> =
  Object.fromEntries(ROOM_THEMES.map((t) => [t.id, t]));
