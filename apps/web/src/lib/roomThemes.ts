// apps/web/src/lib/roomThemes.ts
// Ambientes de sala — fondos DECORATIVOS, épicos y vivos (kawaii premium, celeste/crema).
// Solo afectan un fondo animado detrás del contenido (pointer-events:none) — nunca la
// funcionalidad. El componente RoomThemeBackdrop interpreta `decor` y arma las capas.
// minTier: gating SOLO para el tema personal de supporter (2=colaborador, 3=patrocinador).
// El selector de Ambiente de la sala (Centro de Control) los ofrece todos.
import { Cloud, Sparkles, Stars, Sunrise, Moon, Droplets, type LucideIcon } from 'lucide-react';

export type ThemeDecor = 'cotton' | 'aurora' | 'starfall' | 'sunset' | 'galaxy' | 'bubbles';

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
  { id: 'cielo-algodon',  name: 'Cielo de algodón', minTier: 2, description: 'Nubes gigantes que flotan en un cielo celeste.', icon: Cloud,    swatch: 'from-sky-200 via-white to-blue-200',          decor: 'cotton' },
  { id: 'aurora-pastel',  name: 'Aurora pastel',    minTier: 2, description: 'Cintas de aurora que ondulan suaves.',        icon: Sparkles, swatch: 'from-cyan-200 via-violet-200 to-rose-200',     decor: 'aurora' },
  { id: 'lluvia-estrellas',name:'Lluvia de estrellas',minTier:3, description: 'Estrellas que titilan y caen despacio.',      icon: Stars,    swatch: 'from-indigo-300 via-sky-300 to-violet-300',    decor: 'starfall' },
  { id: 'atardecer-malva', name: 'Atardecer malvavisco', minTier: 3, description: 'Cielo durazno y rosa con nubes tibias.',  icon: Sunrise,  swatch: 'from-rose-200 via-amber-100 to-sky-200',       decor: 'sunset' },
  { id: 'galaxia-kawaii', name: 'Galaxia kawaii',   minTier: 3, description: 'Nebulosas pastel y un cielo estrellado.',     icon: Moon,     swatch: 'from-indigo-300 via-violet-300 to-rose-200',   decor: 'galaxy' },
  { id: 'burbujas',       name: 'Burbujas',         minTier: 2, description: 'Burbujas translúcidas que suben flotando.',   icon: Droplets, swatch: 'from-sky-100 via-cyan-100 to-blue-200',        decor: 'bubbles' },
];

export const THEME_BY_ID: Record<string, RoomTheme> =
  Object.fromEntries(ROOM_THEMES.map((t) => [t.id, t]));
