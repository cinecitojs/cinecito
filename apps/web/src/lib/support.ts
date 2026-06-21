// apps/web/src/lib/support.ts
// Configuración de la sección de apoyo voluntario. Todo aquí es declarativo para que la
// página y el modal lean de una sola fuente. Importante (monetización ética):
// - Cinecito es y será usable de forma gratuita.
// - Los niveles son SIMBÓLICOS: todos apoyan igual; las diferencias son solo visuales.
// - Las recompensas son cosméticas: no dan ventaja competitiva ni desbloquean funciones.

import {
  Heart, Sparkles, Crown, Server, Wrench, Code2, Coins,
  type LucideIcon,
} from 'lucide-react';

// Enlace único de apoyo (Ko-fi). Toda la app debe redirigir aquí, en nueva pestaña.
export const KOFI_URL = 'https://ko-fi.com/cinecitojs';

// Moneda y nota. Los montos son SUGERENCIAS editables, no precios.
export const SUPPORT_CURRENCY = { symbol: '$', code: 'USD', note: 'aporte sugerido · elegís el monto en Ko-fi' };

export type SupportFrequency = 'once' | 'monthly';

export interface SupportTier {
  id: 'amigo' | 'colaborador' | 'patrocinador';
  name: string;
  tagline: string;
  suggested: number;        // monto sugerido (no obligatorio)
  icon: LucideIcon;
  /** Clases de acento por tier (tokens existentes del design system). */
  accent: string;           // texto
  ring: string;             // borde/realce
  glow: string;             // fondo suave
  premium?: boolean;        // acento premium (Patrocinador). Solo visual.
  /** Agradecimientos COSMÉTICOS (no funcionales). */
  perks: string[];
}

export const SUPPORT_TIERS: SupportTier[] = [
  {
    id: 'amigo',
    name: 'Amigo de Cinecito',
    tagline: 'Ayudás a mantener las luces encendidas.',
    suggested: 3,
    icon: Heart,
    accent: 'text-pink-500',
    ring: 'border-pink-300 dark:border-pink-500/40',
    glow: 'from-pink-500/10',
    perks: [
      'Insignia exclusiva',
      'Marco decorativo básico',
    ],
  },
  {
    id: 'colaborador',
    name: 'Colaborador',
    tagline: 'Impulsás nuevas funciones y mejoras.',
    suggested: 8,
    icon: Sparkles,
    accent: 'text-primary',
    ring: 'border-primary',
    glow: 'from-primary/10',
    perks: [
      'Insignia exclusiva',
      'Fondo exclusivo de perfil',
      'Efectos visuales decorativos',
    ],
  },
  {
    id: 'patrocinador',
    name: 'Patrocinador',
    tagline: 'Sostenés Cinecito a lo grande.',
    suggested: 20,
    icon: Crown,
    accent: 'text-accent-fg dark:text-accent',
    ring: 'border-accent/60',
    glow: 'from-accent/10',
    premium: true,
    perks: [
      'Insignia premium',
      'Fondo exclusivo de perfil',
      'Tema exclusivo para salas',
      'Distintivo especial visible',
      'Lugar destacado en agradecimientos',
    ],
  },
];

// Recompensas cosméticas (showcase). Cada una con un descargo implícito en la página.
export interface CosmeticReward {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export const COSMETIC_REWARDS: CosmeticReward[] = [
  { id: 'badge',      title: 'Insignia de apoyo',        description: 'Un distintivo simpático junto a tu nombre.', icon: Sparkles },
  { id: 'background',  title: 'Fondo exclusivo de perfil', description: 'Un fondo decorativo para tu tarjeta de perfil.', icon: Heart },
  { id: 'effects',     title: 'Efectos decorativos',       description: 'Pequeños detalles animados, solo estéticos.', icon: Sparkles },
  { id: 'recognition', title: 'Reconocimiento opcional',   description: 'Aparecé en el muro de agradecimientos si querés.', icon: Crown },
];

export const COSMETIC_DISCLAIMERS = [
  'No otorgan ninguna ventaja competitiva.',
  'No desbloquean funciones esenciales.',
  'Son únicamente elementos visuales de agradecimiento.',
];

// Indicador de impacto: CATEGORÍAS de costo (no es una meta de recaudación).
export interface ImpactItem {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export const IMPACT_ITEMS: ImpactItem[] = [
  { id: 'hosting',    title: 'Hosting y servidores',     description: 'Mantener Cinecito en línea, rápido y disponible para todos.', icon: Server },
  { id: 'features',   title: 'Desarrollo de funciones',  description: 'Construir cosas nuevas y mejorar las que ya existen.', icon: Code2 },
  { id: 'maintenance',title: 'Mantenimiento',            description: 'Corregir errores, actualizar y cuidar la plataforma.', icon: Wrench },
  { id: 'operations', title: 'Costos operativos',        description: 'Dominio, base de datos, servicios y herramientas necesarias.', icon: Coins },
];

// Transparencia: los descargos clave que evitan apariencia de inversión/crowdfunding.
export const TRANSPARENCY_POINTS = [
  'Tu aporte es 100% voluntario.',
  'No es una inversión.',
  'No otorga participación ni acciones en el proyecto.',
  'No da propiedad sobre Cinecito.',
  'No garantiza funciones futuras.',
];
