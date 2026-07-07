// ============================================================
// apps/api/src/lib/supporter.ts
// Reglas de apoyo: rango de niveles, insignia por defecto, temas desbloqueados y la
// concesión de recompensas (solo COSMÉTICAS). grantSupporter es idempotente y se
// llama ÚNICAMENTE tras confirmar un pago (webhook) o vía dev-grant en desarrollo.
// ============================================================

import { prisma } from './db';

export type SupporterTier = 'amigo' | 'colaborador' | 'patrocinador';

export const TIER_RANK: Record<string, number> = { amigo: 1, colaborador: 2, patrocinador: 3 };

export const DEFAULT_BADGE: Record<SupporterTier, string> = {
  amigo: 'amigo', colaborador: 'colaborador', patrocinador: 'patrocinador',
};

// Tema de sala → nivel mínimo que lo desbloquea. DEBE coincidir con los ids de
// apps/web/src/lib/roomThemes.ts (los ids legacy cine-clasico/palomitas/neon ya
// no existen en el catálogo web y dejaban todo bloqueado).
export const THEME_MIN_TIER: Record<string, number> = {
  'cielo-algodon': 2,
  'aurora-pastel': 2,
  'burbujas': 2,
  'copos-nieve': 2,
  'lluvia-estrellas': 3,
  'atardecer-malva': 3,
  'galaxia-kawaii': 3,
};

export function isTier(v: unknown): v is SupporterTier {
  return v === 'amigo' || v === 'colaborador' || v === 'patrocinador';
}

export function rankOf(tier?: string | null): number {
  return (tier && TIER_RANK[tier]) || 0;
}

// Temas que un nivel tiene desbloqueados (acumulativo por rango).
export function unlockedThemes(tier?: string | null): string[] {
  const r = rankOf(tier);
  return Object.entries(THEME_MIN_TIER).filter(([, min]) => r >= min).map(([id]) => id);
}

// Concede el nivel de supporter (no degrada: conserva el rango más alto alcanzado).
export async function grantSupporter(userId: string, tier: SupporterTier): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  // Conserva el rango más alto alcanzado (no degrada el ENTITLEMENT).
  const keepTier = rankOf(tier) >= rankOf(user.supporterTier) ? tier : (user.supporterTier as SupporterTier);
  // Al SUBIR de nivel, el estilo mostrado se actualiza al nuevo tier; en re-grants del
  // mismo nivel se respeta el estilo que el usuario haya elegido (supporterBadge).
  const upgraded = rankOf(tier) > rankOf(user.supporterTier);
  await prisma.user.update({
    where: { id: userId },
    data: {
      supporterTier: keepTier,
      supporterSince: user.supporterSince ?? new Date(),
      supporterBadge: upgraded ? keepTier : (user.supporterBadge ?? DEFAULT_BADGE[keepTier]),
    },
  });
}

// Marca una contribución como confirmada (idempotente) y concede recompensas.
export async function confirmContribution(opts: {
  provider: string;
  providerRef: string;
  userId?: string | null;
  tier?: string | null;
  amount?: number;
}): Promise<{ confirmed: boolean }> {
  // Buscar por (provider, providerRef) — idempotencia del webhook.
  const existing = await prisma.contribution.findFirst({
    where: { provider: opts.provider, providerRef: opts.providerRef },
  });

  let contribution = existing;
  if (!contribution) {
    // Si el webhook llega sin intención previa, crearla ya confirmada.
    contribution = await prisma.contribution.create({
      data: {
        provider: opts.provider, providerRef: opts.providerRef,
        userId: opts.userId ?? null, tier: opts.tier ?? 'amigo',
        amount: opts.amount ?? 0, status: 'confirmed', confirmedAt: new Date(),
      },
    });
  } else if (contribution.status !== 'confirmed') {
    contribution = await prisma.contribution.update({
      where: { id: contribution.id },
      data: { status: 'confirmed', confirmedAt: new Date() },
    });
  }

  const uid = contribution.userId ?? opts.userId ?? null;
  const tier = (contribution.tier || opts.tier) as SupporterTier;
  if (uid && isTier(tier)) await grantSupporter(uid, tier);
  return { confirmed: true };
}
