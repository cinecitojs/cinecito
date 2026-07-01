// apps/web/src/components/room/RoomThemeBackdrop.tsx
// Fondo de AMBIENTE de sala — épico, vivo y kawaii premium (celeste/crema).
// Capas animadas por CSS (transform/opacity → compositor): nubes gigantes,
// aurora, lluvia de estrellas, nebulosas, burbujas, destellos y motas flotantes.
//
// AISLAMIENTO: el root es `absolute inset-0 -z-10 isolate pointer-events-none`.
// Con z-index negativo queda DETRÁS de todo el contenido (incluso el que no tiene
// z-index propio: iconos, chat, video, controles) pero por encima del color de
// fondo del contenedor. Sus capas nunca capturan el puntero ni tapan texto/botones.
// Respeta prefers-reduced-motion (clases amb-* + motion-reduce:).
import React, { useMemo } from 'react';
import { THEME_BY_ID, type ThemeDecor } from '../../lib/roomThemes';

// Posiciones estables (no se regeneran en cada render).
function useField<T>(make: () => T, n: number): T[] {
  return useMemo(() => Array.from({ length: n }, make), []); // eslint-disable-line react-hooks/exhaustive-deps
}

// Destello kawaii de 4 puntas. Flota (capa externa) y late (capa interna) con
// transforms separados para que no colisionen.
function Sparkle({ x, y, size, tone, dur, delay, drift }:
  { x: number; y: number; size: number; tone: string; dur: number; delay: number; drift: 1 | 2 }) {
  return (
    <span className={`absolute pointer-events-none ${drift === 1 ? 'amb-floaty' : 'amb-floaty-2'} motion-reduce:animate-none`}
      style={{ left: `${x}%`, top: `${y}%`, ['--d' as string]: `${dur}s`, ['--delay' as string]: `${(delay % 3).toFixed(2)}s` }}>
      <svg width={size} height={size} viewBox="0 0 24 24" className="amb-pulse motion-reduce:animate-none"
        style={{ ['--d' as string]: `${3 + (delay % 3)}s`, ['--delay' as string]: `${delay}s`, filter: `drop-shadow(0 0 ${size * 0.3}px ${tone})` }}>
        <path d="M12 2c.5 3.8 2 5.5 5.6 6.2-3.6.7-5.1 2.4-5.6 6.2-.5-3.8-2-5.5-5.6-6.2C10 7.5 11.5 5.8 12 2Z" fill={tone} opacity="0.92" />
      </svg>
    </span>
  );
}

// Tono de los destellos flotantes según el ambiente (personalidad por preset).
const SPARKLE_TONE: Record<ThemeDecor, string> = {
  cotton:   'rgba(255,236,178,0.95)',
  aurora:   'rgba(214,238,255,0.95)',
  starfall: 'rgba(255,255,255,0.95)',
  sunset:   'rgba(255,206,170,0.95)',
  galaxy:   'rgba(224,206,246,0.95)',
  bubbles:  'rgba(210,240,252,0.95)',
};

export default function RoomThemeBackdrop({ themeId }: { themeId?: string | null }) {
  const theme = themeId ? THEME_BY_ID[themeId] : null;

  const stars    = useField(() => ({ left: Math.random() * 100, top: Math.random() * 100, size: 1.5 + Math.random() * 3, delay: Math.random() * 3, dur: 2.4 + Math.random() * 2.6 }), 88);
  const bubbles  = useField(() => ({ left: Math.random() * 100, size: 12 + Math.random() * 54, delay: Math.random() * 12, dur: 9 + Math.random() * 12 }), 42);
  const drops    = useField(() => ({ left: Math.random() * 100, h: 18 + Math.random() * 30, delay: Math.random() * 7, dur: 5 + Math.random() * 4 }), 36);
  const shoots   = useField(() => ({ top: 5 + Math.random() * 35, left: -10 + Math.random() * 30, delay: 1.5 + Math.random() * 9, dur: 5.5 + Math.random() * 4 }), 8);
  // Destellos flotantes compartidos (unifican la identidad "kawaii premium").
  const sparkles = useField(() => ({ x: Math.random() * 96 + 2, y: Math.random() * 92 + 4, size: 10 + Math.random() * 16, delay: Math.random() * 6, dur: 10 + Math.random() * 8, drift: (Math.random() > 0.5 ? 1 : 2) as 1 | 2 }), 28);

  if (!theme) return null;
  const { decor, swatch } = theme;
  const sparkTone = SPARKLE_TONE[decor];

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 isolate overflow-hidden" aria-hidden="true">
      {/* Tinte base del ambiente (presente y vibrante) */}
      <div className={`absolute inset-0 bg-gradient-to-br ${swatch} opacity-[0.34] dark:opacity-[0.44]`} />

      {/* Profundidad: viñeta suave en los bordes (no toca el centro → legibilidad) */}
      <div className="absolute inset-0 bg-[radial-gradient(130%_90%_at_50%_-8%,transparent_52%,rgba(28,38,66,0.12)_100%)]
                      dark:bg-[radial-gradient(130%_90%_at_50%_-8%,transparent_46%,rgba(6,10,24,0.42)_100%)]" />

      {/* ── Cielo de algodón ── */}
      {decor === 'cotton' && (
        <>
          <div className="absolute left-1/2 -top-40 -translate-x-1/2 w-[50rem] h-[50rem] rounded-full amb-glow
                          bg-[radial-gradient(circle,rgba(255,247,214,.62),transparent_60%)]" />
          {[
            { c: 'w-[40rem] h-64 top-[6%] left-[-12rem]',      cls: 'amb-drift-far' },
            { c: 'w-[32rem] h-52 top-[22%] right-[-9rem]',     cls: 'amb-drift-far-2' },
            { c: 'w-[46rem] h-72 bottom-[-8rem] left-[-7rem]', cls: 'amb-drift-far' },
            { c: 'w-[28rem] h-48 top-[44%] left-[38%]',        cls: 'amb-drift-2' },
            { c: 'w-[24rem] h-40 top-[62%] right-[6%]',        cls: 'amb-drift' },
            { c: 'w-[30rem] h-48 top-[14%] left-[28%]',        cls: 'amb-drift-far-2' },
            { c: 'w-[22rem] h-36 bottom-[8%] right-[-4rem]',   cls: 'amb-drift' },
          ].map((b, i) => (
            <div key={i} className={`absolute ${b.c} rounded-full bg-white/80 dark:bg-white/[0.10] blur-2xl ${b.cls}`}
              style={{ animationDelay: `${i * 1.4}s` }} />
          ))}
          {stars.slice(0, 32).map((s, i) => (
            <span key={i} className="absolute rounded-full bg-marquee/85 theme-twinkle motion-reduce:animate-none"
              style={{ left: `${s.left}%`, top: `${s.top * 0.6}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s`, boxShadow: '0 0 5px rgba(240,194,119,.6)' }} />
          ))}
        </>
      )}

      {/* ── Aurora pastel ── */}
      {decor === 'aurora' && (
        <>
          {[
            'from-cyan-300/60 via-sky-200/45 to-transparent top-[2%]',
            'from-violet-300/60 via-fuchsia-200/40 to-transparent top-[22%]',
            'from-rose-300/55 via-pink-200/40 to-transparent top-[42%]',
            'from-emerald-200/50 via-teal-200/35 to-transparent top-[60%]',
            'from-indigo-300/50 via-blue-200/35 to-transparent top-[74%]',
            'from-amber-200/45 via-rose-200/30 to-transparent top-[88%]',
          ].map((g, i) => (
            <div key={i} className={`absolute -inset-x-1/4 h-52 bg-gradient-to-r ${g} blur-3xl amb-aurora rounded-full`}
              style={{ animationDelay: `${i * 1.9}s` }} />
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
          <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[48rem] h-[48rem] rounded-full amb-glow
                          bg-[radial-gradient(circle,rgba(255,196,170,.62),transparent_62%)]" />
          {[
            { c: 'w-[38rem] h-60 top-[12%] left-[-10rem]', cls: 'amb-drift-far' },
            { c: 'w-[30rem] h-48 top-[28%] right-[-8rem]', cls: 'amb-drift-far-2' },
            { c: 'w-[42rem] h-64 bottom-[0%] left-[8%]',   cls: 'amb-drift-far' },
          ].map((b, i) => (
            <div key={i} className={`absolute ${b.c} rounded-full bg-gradient-to-br from-white/80 to-rose-200/60 dark:from-white/[0.10] dark:to-rose-300/12 blur-2xl ${b.cls}`}
              style={{ animationDelay: `${i * 1.6}s` }} />
          ))}
          {/* Brasas tibias que ascienden (personalidad de atardecer) */}
          {bubbles.slice(0, 24).map((b, i) => (
            <span key={i} className="absolute bottom-[-6%] amb-rise motion-reduce:hidden rounded-full"
              style={{ left: `${b.left}%`, width: 4 + (i % 3) * 2, height: 4 + (i % 3) * 2,
                background: 'radial-gradient(circle, rgba(255,214,170,.95), rgba(255,170,150,.25) 70%, transparent)',
                animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s` }} />
          ))}
          {stars.slice(0, 28).map((s, i) => (
            <span key={i} className="absolute rounded-full bg-amber-100 theme-twinkle motion-reduce:animate-none"
              style={{ left: `${s.left}%`, top: `${s.top * 0.55}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }} />
          ))}
        </>
      )}

      {/* ── Galaxia kawaii ── */}
      {decor === 'galaxy' && (
        <>
          <div className="absolute w-[38rem] h-[38rem] rounded-full blur-3xl amb-drift-far bg-[radial-gradient(circle,rgba(196,166,236,.58),transparent_60%)]" style={{ top: '-8%', left: '-6%' }} />
          <div className="absolute w-[34rem] h-[34rem] rounded-full blur-3xl amb-drift-far-2 bg-[radial-gradient(circle,rgba(244,176,201,.52),transparent_60%)]" style={{ bottom: '-10%', right: '-4%' }} />
          <div className="absolute w-[30rem] h-[30rem] rounded-full blur-3xl amb-drift-far bg-[radial-gradient(circle,rgba(150,180,235,.46),transparent_60%)]" style={{ top: '30%', left: '40%', animationDelay: '3s' }} />
          <div className="absolute w-[22rem] h-[22rem] rounded-full blur-3xl amb-drift-2 bg-[radial-gradient(circle,rgba(120,220,220,.34),transparent_62%)]" style={{ bottom: '8%', left: '12%', animationDelay: '5s' }} />
          <div className="absolute w-[26rem] h-[26rem] rounded-full blur-3xl amb-drift-far-2 bg-[radial-gradient(circle,rgba(236,180,244,.34),transparent_62%)]" style={{ top: '48%', right: '18%', animationDelay: '7s' }} />
          {stars.map((s, i) => (
            <span key={i} className="absolute rounded-full bg-white theme-twinkle motion-reduce:animate-none"
              style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s`, boxShadow: '0 0 5px rgba(255,255,255,.6)' }} />
          ))}
          {shoots.slice(0, 5).map((s, i) => (
            <span key={i} className="absolute amb-shoot motion-reduce:hidden"
              style={{ top: `${s.top}%`, left: `${s.left}%`, width: 80, height: 2, background: 'linear-gradient(to right, rgba(224,206,246,0), rgba(255,255,255,.95))', borderRadius: 2, animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }} />
          ))}
        </>
      )}

      {/* ── Burbujas (mágicas: iridiscentes, con brillo y micro-destellos) ── */}
      {decor === 'bubbles' && (
        <>
          <div className="absolute left-1/2 -top-32 -translate-x-1/2 w-[46rem] h-[46rem] rounded-full amb-glow
                          bg-[radial-gradient(circle,rgba(200,235,250,.66),transparent_62%)]" />
          <div className="absolute -bottom-28 right-[8%] w-[34rem] h-[34rem] rounded-full amb-glow
                          bg-[radial-gradient(circle,rgba(214,224,255,.52),transparent_64%)]" style={{ animationDelay: '2.4s' }} />
          <div className="absolute -bottom-24 left-[6%] w-[30rem] h-[30rem] rounded-full amb-glow
                          bg-[radial-gradient(circle,rgba(210,246,236,.44),transparent_64%)]" style={{ animationDelay: '4s' }} />

          {/* Burbujas iridiscentes: highlight de luz + tinte pastel + halo */}
          {bubbles.map((b, i) => (
            <span key={i} className="absolute bottom-[-12%] amb-rise motion-reduce:hidden rounded-full"
              style={{ left: `${b.left}%`, width: b.size, height: b.size, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`,
                background: 'radial-gradient(40% 36% at 32% 26%, rgba(255,255,255,.95), rgba(255,255,255,.06) 58%, transparent 70%), radial-gradient(circle at 72% 74%, rgba(180,224,255,.30), transparent 60%), radial-gradient(circle at 50% 50%, rgba(224,206,246,.12), transparent 70%)',
                border: '1px solid rgba(255,255,255,.55)',
                boxShadow: 'inset 0 0 12px rgba(255,255,255,.4), 0 0 12px rgba(190,224,255,.45)' }} />
          ))}

          {/* Micro-destellos que ascienden entre las burbujas */}
          {drops.slice(0, 20).map((d, i) => (
            <span key={i} className="absolute bottom-[-6%] amb-rise motion-reduce:hidden rounded-full"
              style={{ left: `${d.left}%`, width: 3, height: 3, background: 'rgba(255,255,255,.95)',
                boxShadow: '0 0 6px rgba(255,255,255,.85)', animationDelay: `${d.delay}s`, animationDuration: `${d.dur + 3}s` }} />
          ))}

          {/* Titileo suave arriba */}
          {stars.slice(0, 18).map((s, i) => (
            <span key={i} className="absolute rounded-full bg-white theme-twinkle motion-reduce:animate-none"
              style={{ left: `${s.left}%`, top: `${s.top * 0.7}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s`, boxShadow: '0 0 5px rgba(255,255,255,.7)' }} />
          ))}
        </>
      )}

      {/* ── Destellos flotantes compartidos (identidad kawaii premium) ── */}
      {sparkles.map((s, i) => (
        <Sparkle key={i} x={s.x} y={s.y} size={s.size} tone={sparkTone} dur={s.dur} delay={s.delay} drift={s.drift} />
      ))}
    </div>
  );
}
