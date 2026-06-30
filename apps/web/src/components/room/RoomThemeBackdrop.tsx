// apps/web/src/components/room/RoomThemeBackdrop.tsx
// Fondo de AMBIENTE de sala — épico, vivo y kawaii premium (celeste/crema).
// Capas animadas por CSS (transform/opacity → compositor): nubes gigantes,
// aurora, lluvia de estrellas, nebulosas, burbujas. Absoluto, pointer-events:none,
// detrás del contenido. No afecta la funcionalidad. Respeta prefers-reduced-motion.
import React, { useMemo } from 'react';
import { THEME_BY_ID } from '../../lib/roomThemes';

// Posiciones estables (no se regeneran en cada render).
function useField<T>(make: () => T, n: number): T[] {
  return useMemo(() => Array.from({ length: n }, make), []); // eslint-disable-line react-hooks/exhaustive-deps
}

export default function RoomThemeBackdrop({ themeId }: { themeId?: string | null }) {
  const theme = themeId ? THEME_BY_ID[themeId] : null;

  const stars   = useField(() => ({ left: Math.random() * 100, top: Math.random() * 100, size: 1.5 + Math.random() * 2.5, delay: Math.random() * 3, dur: 2.4 + Math.random() * 2.6 }), 34);
  const bubbles = useField(() => ({ left: Math.random() * 100, size: 14 + Math.random() * 46, delay: Math.random() * 12, dur: 11 + Math.random() * 12 }), 16);
  const drops   = useField(() => ({ left: Math.random() * 100, h: 16 + Math.random() * 26, delay: Math.random() * 7, dur: 5.5 + Math.random() * 4 }), 14);
  const shoots  = useField(() => ({ top: 5 + Math.random() * 35, left: -10 + Math.random() * 30, delay: 2 + Math.random() * 9, dur: 6 + Math.random() * 4 }), 3);

  if (!theme) return null;
  const { decor, swatch } = theme;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Tinte base del ambiente (con más presencia que antes) */}
      <div className={`absolute inset-0 bg-gradient-to-br ${swatch} opacity-[0.22] dark:opacity-[0.30]`} />

      {/* ── Cielo de algodón ── */}
      {decor === 'cotton' && (
        <>
          <div className="absolute left-1/2 -top-40 -translate-x-1/2 w-[46rem] h-[46rem] rounded-full amb-glow
                          bg-[radial-gradient(circle,rgba(255,247,214,.5),transparent_60%)]" />
          {[
            { c: 'w-[34rem] h-56 top-[8%] left-[-10rem]', cls: 'amb-drift' },
            { c: 'w-[28rem] h-48 top-[24%] right-[-8rem]', cls: 'amb-drift-2' },
            { c: 'w-[40rem] h-60 bottom-[-6rem] left-[-6rem]', cls: 'amb-drift' },
            { c: 'w-[24rem] h-44 top-[46%] left-[40%]', cls: 'amb-drift-2' },
          ].map((b, i) => (
            <div key={i} className={`absolute ${b.c} rounded-full bg-white/70 dark:bg-white/[0.08] blur-2xl ${b.cls}`}
              style={{ animationDelay: `${i * 1.4}s` }} />
          ))}
          {stars.slice(0, 10).map((s, i) => (
            <span key={i} className="absolute rounded-full bg-marquee/80 theme-twinkle motion-reduce:animate-none"
              style={{ left: `${s.left}%`, top: `${s.top * 0.6}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }} />
          ))}
        </>
      )}

      {/* ── Aurora pastel ── */}
      {decor === 'aurora' && (
        <>
          {[
            'from-cyan-300/40 via-sky-200/30 to-transparent top-[6%]',
            'from-violet-300/40 via-fuchsia-200/25 to-transparent top-[30%]',
            'from-rose-300/35 via-pink-200/25 to-transparent top-[54%]',
          ].map((g, i) => (
            <div key={i} className={`absolute -inset-x-1/4 h-48 bg-gradient-to-r ${g} blur-3xl amb-aurora rounded-full`}
              style={{ animationDelay: `${i * 2.2}s` }} />
          ))}
          {stars.map((s, i) => (
            <span key={i} className="absolute rounded-full bg-white theme-twinkle motion-reduce:animate-none"
              style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }} />
          ))}
        </>
      )}

      {/* ── Lluvia de estrellas ── */}
      {decor === 'starfall' && (
        <>
          {stars.map((s, i) => (
            <span key={i} className="absolute rounded-full bg-white theme-twinkle motion-reduce:animate-none"
              style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s`, boxShadow: '0 0 6px rgba(255,255,255,.7)' }} />
          ))}
          {drops.map((d, i) => (
            <span key={i} className="absolute amb-fall motion-reduce:hidden rounded-full"
              style={{ left: `${d.left}%`, top: '-5%', width: 2, height: d.h, background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(200,225,255,.95))', animationDelay: `${d.delay}s`, animationDuration: `${d.dur}s` }} />
          ))}
          {shoots.map((s, i) => (
            <span key={i} className="absolute amb-shoot motion-reduce:hidden"
              style={{ top: `${s.top}%`, left: `${s.left}%`, width: 90, height: 2, background: 'linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,.95))', borderRadius: 2, animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }} />
          ))}
        </>
      )}

      {/* ── Atardecer malvavisco ── */}
      {decor === 'sunset' && (
        <>
          <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[44rem] h-[44rem] rounded-full amb-glow
                          bg-[radial-gradient(circle,rgba(255,196,170,.5),transparent_62%)]" />
          {[
            { c: 'w-[32rem] h-52 top-[14%] left-[-8rem]', cls: 'amb-drift' },
            { c: 'w-[26rem] h-44 top-[30%] right-[-7rem]', cls: 'amb-drift-2' },
            { c: 'w-[36rem] h-56 bottom-[2%] left-[10%]', cls: 'amb-drift' },
          ].map((b, i) => (
            <div key={i} className={`absolute ${b.c} rounded-full bg-gradient-to-br from-white/70 to-rose-200/50 dark:from-white/[0.08] dark:to-rose-300/10 blur-2xl ${b.cls}`}
              style={{ animationDelay: `${i * 1.6}s` }} />
          ))}
          {stars.slice(0, 12).map((s, i) => (
            <span key={i} className="absolute rounded-full bg-amber-100 theme-twinkle motion-reduce:animate-none"
              style={{ left: `${s.left}%`, top: `${s.top * 0.55}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }} />
          ))}
        </>
      )}

      {/* ── Galaxia kawaii ── */}
      {decor === 'galaxy' && (
        <>
          <div className="absolute w-[34rem] h-[34rem] rounded-full blur-3xl amb-drift bg-[radial-gradient(circle,rgba(196,166,236,.45),transparent_60%)]" style={{ top: '-8%', left: '-6%' }} />
          <div className="absolute w-[30rem] h-[30rem] rounded-full blur-3xl amb-drift-2 bg-[radial-gradient(circle,rgba(244,176,201,.40),transparent_60%)]" style={{ bottom: '-10%', right: '-4%' }} />
          <div className="absolute w-[26rem] h-[26rem] rounded-full blur-3xl amb-drift bg-[radial-gradient(circle,rgba(150,180,235,.35),transparent_60%)]" style={{ top: '30%', left: '40%', animationDelay: '3s' }} />
          {stars.map((s, i) => (
            <span key={i} className="absolute rounded-full bg-white theme-twinkle motion-reduce:animate-none"
              style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s`, boxShadow: '0 0 5px rgba(255,255,255,.6)' }} />
          ))}
        </>
      )}

      {/* ── Burbujas ── */}
      {decor === 'bubbles' && (
        <>
          <div className="absolute left-1/2 -top-32 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full amb-glow
                          bg-[radial-gradient(circle,rgba(200,235,250,.5),transparent_62%)]" />
          {bubbles.map((b, i) => (
            <span key={i} className="absolute bottom-[-10%] amb-rise motion-reduce:hidden rounded-full border border-white/40 bg-white/10 backdrop-blur-[1px]"
              style={{ left: `${b.left}%`, width: b.size, height: b.size, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`,
                       boxShadow: 'inset 0 2px 6px rgba(255,255,255,.5)' }} />
          ))}
        </>
      )}
    </div>
  );
}
