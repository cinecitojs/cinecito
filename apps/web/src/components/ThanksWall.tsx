// apps/web/src/components/ThanksWall.tsx
// Muro de agradecimientos: supporters no anónimos. Patrocinadores destacados. Estado
// vacío elegante. Puramente decorativo / de reconocimiento.
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { supportApi } from '../lib/api';
import { Avatar, Button } from './ui';
import { SupporterBadge, SupporterFrame } from './SupporterBadge';
import { rankOf } from '../lib/supporterRewards';
import { useSupportModal } from '../store/useSupportModal';

interface WallItem { username: string; avatar?: string | null; tier: string; since?: string | null; }

export default function ThanksWall() {
  const openSupport = useSupportModal((s) => s.openModal);
  const { data, isLoading } = useQuery({
    queryKey: ['support-wall'],
    queryFn: () => supportApi.wall().then((r) => r.data as { wall: WallItem[]; total: number }),
    staleTime: 60_000,
  });

  if (isLoading) {
    return <div className="h-28 rounded-3xl bg-[var(--surface-2)] dark:bg-dark-surface2 animate-pulse" />;
  }

  const wall = data?.wall ?? [];

  // ── Estado vacío elegante ──
  if (wall.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-[var(--border)] bg-surface/50 dark:bg-dark-surface/50 p-8 text-center">
        <img src="/pocine-empty.png?v=20260622" alt="Pociné esperando" className="w-28 h-auto mx-auto mb-3 select-none motion-reduce:animate-none" draggable={false} />
        <p className="font-display font-bold">Todavía no hay nombres acá… ¡todo listo para el primero! ✨</p>
        <p className="text-sm text-[var(--text-muted)] mt-1 max-w-md mx-auto">
          Si apoyás a Cinecito y querés, tu nombre aparece en este muro. Es opcional y puramente simbólico.
        </p>
        <Button className="mt-4" onClick={() => openSupport()}><Heart className="w-4 h-4" /> Ser el primero</Button>
      </div>
    );
  }

  const featured = wall.filter((w) => rankOf(w.tier) >= 3);
  const rest = wall.filter((w) => rankOf(w.tier) < 3);

  return (
    <div className="space-y-5">
      {/* Patrocinadores destacados */}
      {featured.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((w) => (
            <div key={w.username} className="flex items-center gap-3 rounded-3xl border border-[var(--border)] bg-surface dark:bg-dark-surface p-4">
              <SupporterFrame tier={w.tier} name={w.username} src={w.avatar} size={40} className="shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{w.username}</p>
                <SupporterBadge tier={w.tier} size="xs" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resto de supporters (chips compactos) */}
      {rest.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {rest.map((w) => (
            <div key={w.username} className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-surface dark:bg-dark-surface pl-1 pr-3 py-1">
              <Avatar name={w.username} src={w.avatar} size="xs" />
              <span className="text-xs font-semibold">{w.username}</span>
              <SupporterBadge tier={w.tier} size="xs" showLabel={false} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
