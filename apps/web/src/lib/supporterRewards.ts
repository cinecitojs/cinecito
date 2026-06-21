// apps/web/src/lib/supporterRewards.ts
// Mapeo nivel → recompensas COSMÉTICAS (insignia, marco, fondo, efectos, animación,
// temas de sala, reconocimiento). Solo presentación: nada altera funciones del servicio.
import { Heart, Sparkles, Crown, type LucideIcon } from 'lucide-react';

export type SupporterTier = 'amigo' | 'colaborador' | 'patrocinador';
export const TIER_RANK: Record<SupporterTier, number> = { amigo: 1, colaborador: 2, patrocinador: 3 };

export type FrameStyle = 'basic' | 'glow' | 'premium';

export interface TierReward {
  tier: SupporterTier;
  label: string;
  icon: LucideIcon;
  /** Clase de gradiente para insignia/marco (tokens del design system). */
  gradient: string;       // ej. 'from-pink-400 to-pink-600'
  textOn: string;         // color de texto sobre el gradiente
  ring: string;           // color de marco
  frame: FrameStyle;
  hasBackground: boolean;
  hasEffects: boolean;    // efectos decorativos (sparkles)
  hasSpecialAnim: boolean;// animación especial (patrocinador)
  hasRoomThemes: boolean;
  hasRecognition: boolean;
  /** Lista legible para mostrar en la página / ajustes. */
  rewards: string[];
  /** Assets VIP (imágenes reales). framePos = posición del avatar dentro del marco
   *  (cx/cy en % del marco, d = diámetro en % del ancho del marco). */
  assets: {
    bg: string;
    frame: string;
    pochi: string;
    framePos: { cx: number; cy: number; d: number };
  };
}

export const TIER_REWARDS: Record<SupporterTier, TierReward> = {
  amigo: {
    tier: 'amigo', label: 'Amigo de Cinecito', icon: Heart,
    gradient: 'from-pink-400 to-rose-500', textOn: 'text-white', ring: 'ring-pink-400',
    frame: 'basic', hasBackground: false, hasEffects: false, hasSpecialAnim: false,
    hasRoomThemes: false, hasRecognition: true,
    rewards: ['Insignia exclusiva en el perfil', 'Marco decorativo básico'],
    assets: {
      bg: '/vip/banner-amigo.png', frame: '/vip/marcodecorativo-amigo.png', pochi: '/vip/pochi-amigo.png',
      framePos: { cx: 50, cy: 41, d: 33 },
    },
  },
  colaborador: {
    tier: 'colaborador', label: 'Colaborador', icon: Sparkles,
    gradient: 'from-sky-400 to-primary-dark', textOn: 'text-white', ring: 'ring-primary',
    frame: 'glow', hasBackground: true, hasEffects: true, hasSpecialAnim: false,
    hasRoomThemes: false, hasRecognition: true,
    rewards: ['Insignia exclusiva', 'Fondo exclusivo de perfil', 'Efectos visuales decorativos'],
    assets: {
      bg: '/vip/banner-colaborador.png', frame: '/vip/marcodecorativo-premium.png', pochi: '/vip/pochi-premium-colaborador.png',
      framePos: { cx: 51, cy: 41, d: 31 },
    },
  },
  patrocinador: {
    tier: 'patrocinador', label: 'Patrocinador', icon: Crown,
    gradient: 'from-amber-400 via-fuchsia-500 to-violet-600', textOn: 'text-white', ring: 'ring-accent',
    frame: 'premium', hasBackground: true, hasEffects: true, hasSpecialAnim: true,
    hasRoomThemes: true, hasRecognition: true,
    rewards: ['Insignia premium', 'Fondo exclusivo de perfil', 'Tema exclusivo para salas', 'Distintivo especial visible', 'Lugar destacado en agradecimientos'],
    assets: {
      bg: '/vip/banner-patrocinador.png', frame: '/vip/marcodecorativo-vip-premium.png', pochi: '/vip/pochi-vip-patrocinador.png',
      framePos: { cx: 50, cy: 45, d: 30 },
    },
  },
};

export interface Supporter {
  tier: SupporterTier | null;
  since: string | null;
  badge: string | null;
  theme: string | null;
  anonymous: boolean;
  unlockedThemes: string[];
}

export const rankOf = (tier?: string | null): number => (tier && (TIER_RANK as any)[tier]) || 0;
export const rewardOf = (tier?: string | null): TierReward | null =>
  tier && (TIER_REWARDS as any)[tier] ? (TIER_REWARDS as any)[tier] : null;

// Tier cuyo ESTILO (insignia/marco/fondo) se muestra: el elegido (`badge`) o, si no,
// el nivel alcanzado (`tier`). El backend garantiza que badge ≤ tier.
export function displayTierOf(s?: { tier?: string | null; badge?: string | null } | null): SupporterTier | null {
  const t = (s?.badge || s?.tier) as SupporterTier | null;
  return t && (TIER_RANK as any)[t] ? t : null;
}

// Tiers desbloqueados (rank ≤ tier alcanzado), en orden, para elegir estilo.
export function unlockedTiers(tier?: string | null): SupporterTier[] {
  const r = rankOf(tier);
  return (['amigo', 'colaborador', 'patrocinador'] as SupporterTier[]).filter((t) => TIER_RANK[t] <= r);
}

// ¿El supporter tiene al menos cierto nivel? (para condicionar efectos acumulativos)
export const hasAtLeast = (supporter: Supporter | null | undefined, tier: SupporterTier): boolean =>
  rankOf(supporter?.tier) >= TIER_RANK[tier];
