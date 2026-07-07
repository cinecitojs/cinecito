// apps/web/src/lib/roomThemes.ts
// Ambientes de sala — fondos DECORATIVOS con identidad propia por tema (no recolores).
// Solo afectan un fondo animado detrás del contenido (pointer-events:none) — nunca la
// funcionalidad. El componente RoomThemeBackdrop interpreta `decor` y arma las capas.
// IMPORTANTE: los `id` viajan por socket y quedan guardados en salas existentes;
// se renuevan visuales/nombres pero los ids NO cambian (compatibilidad).
// minTier: gating SOLO para el tema personal de supporter (2=colaborador, 3=patrocinador).
// El selector de Ambiente de la sala (Centro de Control) los ofrece todos.
import { Cloud, Sparkles, Stars, Sunrise, Moon, Droplets, Snowflake, type LucideIcon } from 'lucide-react';

export type ThemeDecor = 'cotton' | 'aurora' | 'starfall' | 'sunset' | 'galaxy' | 'bubbles' | 'snow';

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
  { id: 'cielo-algodon',   name: 'Cielo de algodón',    minTier: 2, description: 'Siesta al sol: nubes en capas y motas de luz tibia.',           icon: Cloud,     swatch: 'from-sky-200 via-white to-blue-200',        decor: 'cotton' },
  { id: 'aurora-pastel',   name: 'Aurora pastel',       minTier: 2, description: 'Cortinas de aurora verde-agua y violeta sobre la noche.',      icon: Sparkles,  swatch: 'from-teal-200 via-indigo-300 to-violet-300', decor: 'aurora' },
  { id: 'lluvia-estrellas',name: 'Lluvia de estrellas', minTier: 3, description: 'Vía láctea, cometas y estrellas que piden deseos.',            icon: Stars,     swatch: 'from-indigo-400 via-indigo-300 to-violet-300', decor: 'starfall' },
  { id: 'atardecer-malva', name: 'Atardecer malvavisco',minTier: 3, description: 'Hora dorada: sol bajo, bandas durazno y brasas que suben.',    icon: Sunrise,   swatch: 'from-rose-300 via-amber-200 to-sky-200',    decor: 'sunset' },
  { id: 'galaxia-kawaii',  name: 'Galaxia kawaii',      minTier: 3, description: 'Nebulosas profundas y un planetita con anillo.',               icon: Moon,      swatch: 'from-indigo-400 via-violet-300 to-rose-300', decor: 'galaxy' },
  { id: 'burbujas',        name: 'Burbujas de jabón',   minTier: 2, description: 'Pompas iridiscentes que suben bailando entre haces de luz.',   icon: Droplets,  swatch: 'from-sky-100 via-cyan-100 to-indigo-200',   decor: 'bubbles' },
  { id: 'copos-nieve',     name: 'Copos de nieve',      minTier: 2, description: 'Nevada de medianoche: cristales que caen girando bajo la luna.', icon: Snowflake, swatch: 'from-sky-200 via-indigo-200 to-slate-100',  decor: 'snow' },
];

export const THEME_BY_ID: Record<string, RoomTheme> =
  Object.fromEntries(ROOM_THEMES.map((t) => [t.id, t]));
