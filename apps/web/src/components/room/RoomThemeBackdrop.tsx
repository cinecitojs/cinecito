// apps/web/src/components/room/RoomThemeBackdrop.tsx
// Fondo DECORATIVO de sala (recompensa cosmética). Absoluto, pointer-events:none, sutil.
// No afecta la funcionalidad: solo decora la vista de quien tiene el tema desbloqueado.
import React, { useMemo } from 'react';
import { THEME_BY_ID } from '../../lib/roomThemes';

export default function RoomThemeBackdrop({ themeId }: { themeId?: string | null }) {
  const theme = themeId ? THEME_BY_ID[themeId] : null;

  // Posiciones estables para estrellas/palomitas.
  const dots = useMemo(
    () => Array.from({ length: 28 }).map(() => ({ left: Math.random() * 100, top: Math.random() * 100, delay: Math.random() * 2.4, size: 2 + Math.random() * 2 })),
    [],
  );
  const drops = useMemo(
    () => Array.from({ length: 12 }).map(() => ({ left: Math.random() * 100, delay: Math.random() * 4, dur: 5 + Math.random() * 4 })),
    [],
  );

  if (!theme) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Tinte base del tema */}
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.swatch} opacity-[0.10] dark:opacity-[0.16]`} />

      {theme.decor === 'curtain' && (
        <>
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-red-900/30 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-red-900/30 to-transparent" />
          <div className="absolute top-0 inset-x-0 h-10 bg-gradient-to-b from-red-900/30 to-transparent" />
        </>
      )}

      {theme.decor === 'stars' && dots.map((d, i) => (
        <span key={i} className="absolute rounded-full bg-white theme-twinkle motion-reduce:animate-none"
          style={{ left: `${d.left}%`, top: `${d.top}%`, width: d.size, height: d.size, animationDelay: `${d.delay}s` }} />
      ))}

      {theme.decor === 'popcorn' && drops.map((d, i) => (
        <span key={i} className="absolute theme-popcorn select-none motion-reduce:animate-none"
          style={{ left: `${d.left}%`, top: '-5%', fontSize: '14px', animationDelay: `${d.delay}s`, animationDuration: `${d.dur}s` }}>🍿</span>
      ))}

      {theme.decor === 'neon' && (
        <>
          <div className="absolute -top-10 left-1/4 w-56 h-56 rounded-full bg-fuchsia-500/20 blur-3xl theme-neon motion-reduce:animate-none" />
          <div className="absolute bottom-0 right-1/4 w-56 h-56 rounded-full bg-cyan-400/20 blur-3xl theme-neon motion-reduce:animate-none" style={{ animationDelay: '1s' }} />
        </>
      )}

      {theme.decor === 'scanlines' && (
        <div className="absolute inset-0 opacity-[0.12] mix-blend-overlay"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0.5) 1px, transparent 2px, transparent 4px)' }} />
      )}
    </div>
  );
}
