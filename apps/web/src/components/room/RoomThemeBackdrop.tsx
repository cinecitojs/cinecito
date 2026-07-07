// apps/web/src/components/room/RoomThemeBackdrop.tsx
// Fondo de AMBIENTE de sala — cada tema es una ESCENA con identidad propia
// (composición, profundidad y detalles), no un recolor. Kawaii premium.
// Capas animadas por CSS (transform/opacity → compositor).
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

// Copo de nieve cristalino: 6 brazos con ramitas en V + núcleo. Stroke redondeado
// (delicado, no clipart). Se usa en dos capas de profundidad.
function Flake({ size, tone, className = '', style }:
  { size: number; tone: string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={tone}
      strokeWidth={1.5} strokeLinecap="round" className={className} style={style}>
      {[0, 60, 120].map((r) => (
        <g key={r} transform={`rotate(${r} 12 12)`}>
          <line x1="12" y1="2.5" x2="12" y2="21.5" />
          <path d="M9.9 4.9 12 7l2.1-2.1" />
          <path d="M9.9 19.1 12 17l2.1 2.1" />
        </g>
      ))}
      <circle cx="12" cy="12" r="1" fill={tone} stroke="none" />
    </svg>
  );
}

// Planetita con anillo (detalle de identidad de Galaxia): puro SVG pastel.
function Planet({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 100 62" fill="none">
      <circle cx="50" cy="31" r="20" fill="url(#pg)" />
      <ellipse cx="50" cy="33" rx="38" ry="10" stroke="rgba(244,208,255,.85)" strokeWidth="3" fill="none"
        transform="rotate(-16 50 33)" />
      {/* la mitad trasera del anillo queda "detrás": se tapa con un arco del color del planeta */}
      <path d="M32 25 A20 20 0 0 1 68 25" stroke="url(#pg)" strokeWidth="7" fill="none" opacity=".9" />
      <circle cx="43" cy="26" r="3.4" fill="rgba(255,255,255,.5)" />
      <circle cx="57" cy="38" r="2.2" fill="rgba(255,255,255,.35)" />
      <defs>
        <linearGradient id="pg" x1="30" y1="12" x2="66" y2="50">
          <stop offset="0" stopColor="#C9B4F2" />
          <stop offset="1" stopColor="#8FA8E8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Tono de los destellos flotantes según el ambiente (personalidad por preset).
const SPARKLE_TONE: Record<ThemeDecor, string> = {
  cotton:   'rgba(255,236,178,0.95)',
  aurora:   'rgba(190,246,228,0.95)',
  starfall: 'rgba(255,255,255,0.95)',
  sunset:   'rgba(255,206,170,0.95)',
  galaxy:   'rgba(224,206,246,0.95)',
  bubbles:  'rgba(210,240,252,0.95)',
  snow:     'rgba(214,236,255,0.95)',
};

export default function RoomThemeBackdrop({ themeId }: { themeId?: string | null }) {
  const theme = themeId ? THEME_BY_ID[themeId] : null;

  const stars    = useField(() => ({ left: Math.random() * 100, top: Math.random() * 100, size: 1.5 + Math.random() * 3, delay: Math.random() * 3, dur: 2.4 + Math.random() * 2.6 }), 88);
  const bubbles  = useField(() => ({ left: Math.random() * 100, size: 14 + Math.random() * 56, delay: Math.random() * 12, dur: 9 + Math.random() * 12, spin: Math.random() * 360 }), 40);
  const drops    = useField(() => ({ left: Math.random() * 100, h: 18 + Math.random() * 30, delay: Math.random() * 7, dur: 5 + Math.random() * 4 }), 36);
  const shoots   = useField(() => ({ top: 5 + Math.random() * 35, left: -10 + Math.random() * 30, delay: 1.5 + Math.random() * 9, dur: 5.5 + Math.random() * 4 }), 8);
  // Copos en 3 capas de profundidad (lejos = chico/tenue/lento borroso; cerca = grande/nítido).
  const flakes   = useField(() => ({ left: Math.random() * 100, delay: Math.random() * 16, layer: Math.floor(Math.random() * 3), seed: Math.random() }), 42);
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

      {/* ── Cielo de algodón: siesta al sol, nubes en DOS profundidades ── */}
      {decor === 'cotton' && (
        <>
          <div className="absolute left-1/2 -top-40 -translate-x-1/2 w-[50rem] h-[50rem] rounded-full amb-glow
                          bg-[radial-gradient(circle,rgba(255,247,214,.62),transparent_60%)]" />
          {/* Banda de horizonte tibia (asienta la escena) */}
          <div className="absolute inset-x-0 -bottom-16 h-56 bg-[linear-gradient(to_top,rgba(255,240,214,.5),transparent)]
                          dark:bg-[linear-gradient(to_top,rgba(120,130,190,.14),transparent)]" />
          {/* Nubes lejanas: más borrosas y tenues, viaje largo */}
          {[
            { c: 'w-[44rem] h-64 top-[4%] left-[-14rem]',   cls: 'amb-drift-far' },
            { c: 'w-[36rem] h-56 top-[20%] right-[-11rem]', cls: 'amb-drift-far-2' },
            { c: 'w-[30rem] h-44 top-[40%] left-[30%]',     cls: 'amb-drift-far-2' },
          ].map((b, i) => (
            <div key={`far-${i}`} className={`absolute ${b.c} rounded-full bg-white/50 dark:bg-white/[0.06] blur-3xl ${b.cls}`}
              style={{ animationDelay: `${i * 2.2}s` }} />
          ))}
          {/* Nubes cercanas: más blancas y definidas */}
          {[
            { c: 'w-[40rem] h-60 bottom-[-6rem] left-[-6rem]', cls: 'amb-drift-far' },
            { c: 'w-[26rem] h-40 top-[58%] right-[4%]',        cls: 'amb-drift' },
            { c: 'w-[30rem] h-44 top-[10%] left-[24%]',        cls: 'amb-drift-2' },
            { c: 'w-[22rem] h-32 bottom-[10%] right-[-4rem]',  cls: 'amb-drift' },
          ].map((b, i) => (
            <div key={`near-${i}`} className={`absolute ${b.c} rounded-full bg-white/85 dark:bg-white/[0.11] blur-xl ${b.cls}`}
              style={{ animationDelay: `${i * 1.6}s` }} />
          ))}
          {/* Motas de polen doradas que suben con pereza */}
          {bubbles.slice(0, 14).map((b, i) => (
            <span key={i} className="absolute bottom-[-6%] amb-rise motion-reduce:hidden rounded-full"
              style={{ left: `${b.left}%`, width: 3 + (i % 3), height: 3 + (i % 3),
                background: 'radial-gradient(circle, rgba(255,226,150,.9), transparent 70%)',
                animationDelay: `${b.delay}s`, animationDuration: `${b.dur + 6}s` }} />
          ))}
          {stars.slice(0, 26).map((s, i) => (
            <span key={i} className="absolute rounded-full bg-marquee/85 theme-twinkle motion-reduce:animate-none"
              style={{ left: `${s.left}%`, top: `${s.top * 0.55}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s`, boxShadow: '0 0 5px rgba(240,194,119,.6)' }} />
          ))}
        </>
      )}

      {/* ── Aurora pastel: CORTINAS verticales (verde-agua/violeta/rosa), no arcoíris ── */}
      {decor === 'aurora' && (
        <>
          {/* Cortinas: nacen arriba con cuerpo y se desvanecen hacia abajo */}
          {[
            { l: '4%',  w: 'w-[24rem]', h: 'h-[68%]', tone: 'rgba(118,230,198,.42)', d: '0s',    skew: '-14deg' },
            { l: '30%', w: 'w-[20rem]', h: 'h-[58%]', tone: 'rgba(168,150,238,.40)', d: '2.4s',  skew: '10deg' },
            { l: '52%', w: 'w-[26rem]', h: 'h-[72%]', tone: 'rgba(120,214,232,.36)', d: '4.6s',  skew: '-8deg' },
            { l: '74%', w: 'w-[18rem]', h: 'h-[54%]', tone: 'rgba(238,164,206,.34)', d: '6.2s',  skew: '13deg' },
          ].map((c, i) => (
            <div key={i} className={`absolute -top-10 ${c.w} ${c.h} blur-2xl amb-aurora rounded-b-full`}
              style={{ left: c.l, animationDelay: c.d, transform: `skewX(${c.skew})`,
                background: `linear-gradient(to bottom, ${c.tone}, transparent 88%)` }} />
          ))}
          {/* Resplandor de reflejo abajo (la aurora "toca" el suelo helado) */}
          <div className="absolute inset-x-0 -bottom-24 h-64 blur-3xl amb-glow
                          bg-[radial-gradient(60%_100%_at_50%_100%,rgba(130,226,206,.28),transparent_70%)]"
            style={{ animationDelay: '3s' }} />
          {/* Estrellas concentradas arriba, donde la noche es más profunda */}
          {stars.map((s, i) => (
            <span key={i} className="absolute rounded-full bg-white theme-twinkle motion-reduce:animate-none"
              style={{ left: `${s.left}%`, top: `${s.top * 0.66}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s`,
                opacity: s.top > 55 ? 0.4 : 1 }} />
          ))}
        </>
      )}

      {/* ── Lluvia de estrellas: vía láctea diagonal + dos profundidades + cometas ── */}
      {decor === 'starfall' && (
        <>
          {/* Banda de vía láctea cruzando en diagonal */}
          <div className="absolute -inset-x-1/4 top-[16%] h-72 blur-3xl amb-drift-far rotate-[-14deg]
                          bg-[linear-gradient(90deg,transparent,rgba(214,222,255,.30)_30%,rgba(255,255,255,.38)_50%,rgba(214,222,255,.30)_70%,transparent)]
                          dark:bg-[linear-gradient(90deg,transparent,rgba(190,204,255,.16)_30%,rgba(235,240,255,.22)_50%,rgba(190,204,255,.16)_70%,transparent)]" />
          {/* Estrellas lejanas (tenues, sin glow) */}
          {stars.slice(0, 44).map((s, i) => (
            <span key={`far-${i}`} className="absolute rounded-full bg-white/55 theme-twinkle motion-reduce:animate-none"
              style={{ left: `${s.left}%`, top: `${s.top}%`, width: Math.max(1, s.size - 1.5), height: Math.max(1, s.size - 1.5), animationDelay: `${s.delay}s`, animationDuration: `${s.dur + 2}s` }} />
          ))}
          {/* Estrellas cercanas (brillantes) */}
          {stars.slice(44).map((s, i) => (
            <span key={`near-${i}`} className="absolute rounded-full bg-white theme-twinkle motion-reduce:animate-none"
              style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s`, boxShadow: '0 0 7px rgba(255,255,255,.8)' }} />
          ))}
          {/* Polvo de estrellas cayendo */}
          {drops.map((d, i) => (
            <span key={i} className="absolute amb-fall motion-reduce:hidden rounded-full"
              style={{ left: `${d.left}%`, top: '-5%', width: 2, height: d.h, background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(205,222,255,.95))', animationDelay: `${d.delay}s`, animationDuration: `${d.dur}s` }} />
          ))}
          {/* Cometas con cabeza luminosa */}
          {shoots.map((s, i) => (
            <span key={i} className="absolute amb-shoot motion-reduce:hidden"
              style={{ top: `${s.top}%`, left: `${s.left}%`, width: 110, height: 2.5,
                background: 'linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,.55) 70%, #fff)',
                borderRadius: 3, filter: 'drop-shadow(0 0 6px rgba(255,255,255,.9))',
                animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }} />
          ))}
        </>
      )}

      {/* ── Atardecer malvavisco: sol bajo, bandas de bruma y siluetas tibias ── */}
      {decor === 'sunset' && (
        <>
          {/* Sol: disco con núcleo definido, respirando */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-[6%] w-[30rem] h-[30rem] rounded-full amb-glow
                          bg-[radial-gradient(circle,rgba(255,224,166,.85)_0%,rgba(255,196,150,.5)_34%,transparent_64%)]" />
          {/* Bandas de bruma horizontal (durazno → rosa → lila, de abajo hacia arriba) */}
          {[
            { c: 'bottom-[2%] h-40',  tone: 'rgba(255,196,160,.5)',  cls: 'amb-drift',       d: '0s' },
            { c: 'bottom-[22%] h-32', tone: 'rgba(248,178,196,.42)', cls: 'amb-drift-2',     d: '1.8s' },
            { c: 'bottom-[42%] h-28', tone: 'rgba(206,180,232,.34)', cls: 'amb-drift',       d: '3.4s' },
          ].map((b, i) => (
            <div key={i} className={`absolute -inset-x-1/4 ${b.c} rounded-full blur-2xl ${b.cls}`}
              style={{ background: `linear-gradient(90deg, transparent, ${b.tone} 30%, ${b.tone} 70%, transparent)`, animationDelay: b.d }} />
          ))}
          {/* Nubecitas que cruzan frente al sol (silueta rosada, dan profundidad) */}
          {[
            { c: 'w-[26rem] h-16 bottom-[18%] left-[8%]',  cls: 'amb-drift-far' },
            { c: 'w-[20rem] h-12 bottom-[30%] right-[6%]', cls: 'amb-drift-far-2' },
            { c: 'w-[30rem] h-20 bottom-[8%] right-[16%]', cls: 'amb-drift-far' },
          ].map((b, i) => (
            <div key={`sil-${i}`} className={`absolute ${b.c} rounded-full blur-lg ${b.cls}
                            bg-gradient-to-r from-rose-300/55 via-rose-200/45 to-amber-200/40
                            dark:from-rose-400/20 dark:via-rose-300/14 dark:to-amber-300/10`}
              style={{ animationDelay: `${i * 2.1}s` }} />
          ))}
          {/* Brasas tibias que ascienden */}
          {bubbles.slice(0, 22).map((b, i) => (
            <span key={i} className="absolute bottom-[-6%] amb-rise motion-reduce:hidden rounded-full"
              style={{ left: `${b.left}%`, width: 4 + (i % 3) * 2, height: 4 + (i % 3) * 2,
                background: 'radial-gradient(circle, rgba(255,214,170,.95), rgba(255,170,150,.25) 70%, transparent)',
                animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s` }} />
          ))}
          {stars.slice(0, 24).map((s, i) => (
            <span key={i} className="absolute rounded-full bg-amber-100 theme-twinkle motion-reduce:animate-none"
              style={{ left: `${s.left}%`, top: `${s.top * 0.4}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }} />
          ))}
        </>
      )}

      {/* ── Galaxia kawaii: nebulosas profundas + planetita con anillo ── */}
      {decor === 'galaxy' && (
        <>
          <div className="absolute w-[42rem] h-[42rem] rounded-full blur-3xl amb-drift-far bg-[radial-gradient(circle,rgba(178,142,232,.62),transparent_60%)]" style={{ top: '-10%', left: '-8%' }} />
          <div className="absolute w-[36rem] h-[36rem] rounded-full blur-3xl amb-drift-far-2 bg-[radial-gradient(circle,rgba(240,158,196,.5),transparent_60%)]" style={{ bottom: '-12%', right: '-6%' }} />
          <div className="absolute w-[30rem] h-[30rem] rounded-full blur-3xl amb-drift-far bg-[radial-gradient(circle,rgba(126,164,236,.48),transparent_62%)]" style={{ top: '34%', left: '42%', animationDelay: '4s' }} />
          {/* Planetita con anillo: flota despacio en su rincón */}
          <span className="absolute top-[12%] right-[10%] amb-floaty motion-reduce:animate-none opacity-90 dark:opacity-80"
            style={{ ['--d' as string]: '16s', filter: 'drop-shadow(0 6px 18px rgba(178,142,232,.45))' }}>
            <Planet size={120} />
          </span>
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

      {/* ── Burbujas de jabón: iridiscencia real, wobble y haces de luz ── */}
      {decor === 'bubbles' && (
        <>
          {/* Haces de luz entrando desde arriba (como luz en el agua) */}
          {[
            { l: '14%', w: 'w-40', r: 'rotate-[16deg]',  d: '0s' },
            { l: '46%', w: 'w-56', r: 'rotate-[-11deg]', d: '3s' },
            { l: '72%', w: 'w-36', r: 'rotate-[13deg]',  d: '6s' },
          ].map((s, i) => (
            <div key={i} className={`absolute -top-12 ${s.w} h-[70%] ${s.r} blur-2xl amb-aurora
                            bg-[linear-gradient(to_bottom,rgba(255,255,255,.5),transparent_85%)]
                            dark:bg-[linear-gradient(to_bottom,rgba(190,220,255,.16),transparent_85%)]`}
              style={{ left: s.l, animationDelay: s.d }} />
          ))}
          <div className="absolute left-1/2 -top-32 -translate-x-1/2 w-[46rem] h-[46rem] rounded-full amb-glow
                          bg-[radial-gradient(circle,rgba(200,235,250,.6),transparent_62%)]" />

          {/* Pompas: sube el contenedor (amb-rise), el interior hace el jelly-wobble.
              Iridiscencia = película cónica tenue + sombras internas rosa/celeste
              contrapuestas + doble brillo especular. Cada una gira su película. */}
          {bubbles.map((b, i) => (
            <span key={i} className="absolute bottom-[-12%] amb-rise motion-reduce:hidden"
              style={{ left: `${b.left}%`, width: b.size, height: b.size, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s` }}>
              <span className="absolute inset-0 rounded-full amb-wobble"
                style={{ ['--d' as string]: `${3.5 + (i % 4)}s`, ['--delay' as string]: `${(i % 5) * 0.4}s`,
                  background: `radial-gradient(42% 36% at 31% 25%, rgba(255,255,255,.95), rgba(255,255,255,.05) 58%, transparent 68%),
                               radial-gradient(20% 16% at 68% 72%, rgba(255,255,255,.55), transparent 70%),
                               conic-gradient(from ${b.spin}deg, rgba(248,182,214,.16), rgba(168,216,250,.2), rgba(186,240,220,.14), rgba(206,190,246,.18), rgba(248,182,214,.16))`,
                  border: '1px solid rgba(255,255,255,.6)',
                  boxShadow: `inset -${Math.max(3, b.size * 0.08)}px -${Math.max(4, b.size * 0.1)}px ${b.size * 0.22}px rgba(244,160,205,.32),
                              inset ${Math.max(3, b.size * 0.08)}px ${Math.max(4, b.size * 0.1)}px ${b.size * 0.22}px rgba(140,205,250,.36),
                              0 0 ${Math.max(8, b.size * 0.25)}px rgba(170,215,250,.4)` }} />
            </span>
          ))}

          {/* Micro-destellos que ascienden entre las pompas */}
          {drops.slice(0, 18).map((d, i) => (
            <span key={i} className="absolute bottom-[-6%] amb-rise motion-reduce:hidden rounded-full"
              style={{ left: `${d.left}%`, width: 3, height: 3, background: 'rgba(255,255,255,.95)',
                boxShadow: '0 0 6px rgba(255,255,255,.85)', animationDelay: `${d.delay}s`, animationDuration: `${d.dur + 3}s` }} />
          ))}

          {/* Bruma baja: las pompas nacen de algún lado */}
          <div className="absolute -inset-x-10 -bottom-14 h-40 blur-2xl amb-drift
                          bg-[linear-gradient(to_top,rgba(255,255,255,.55),transparent)]
                          dark:bg-[linear-gradient(to_top,rgba(150,190,235,.14),transparent)]" />

          {stars.slice(0, 14).map((s, i) => (
            <span key={i} className="absolute rounded-full bg-white theme-twinkle motion-reduce:animate-none"
              style={{ left: `${s.left}%`, top: `${s.top * 0.6}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s`, boxShadow: '0 0 5px rgba(255,255,255,.7)' }} />
          ))}
        </>
      )}

      {/* ── Copos de nieve: nevada de medianoche bajo la luna ── */}
      {decor === 'snow' && (
        <>
          {/* Luna con halo (respira lentísimo) */}
          <div className="absolute top-[6%] right-[10%] w-[26rem] h-[26rem] rounded-full amb-glow
                          bg-[radial-gradient(circle,rgba(240,246,255,.5)_0%,rgba(206,220,250,.22)_38%,transparent_66%)]"
            style={{ animationDuration: '10s' }} />
          <div className="absolute top-[13%] right-[17%] w-24 h-24 rounded-full
                          bg-[radial-gradient(circle_at_38%_34%,#FFFFFF_0%,#E8EEFA_58%,#C9D6F0_100%)]
                          opacity-90 dark:opacity-95"
            style={{ boxShadow: '0 0 44px rgba(226,236,255,.8), inset -6px -8px 16px rgba(150,170,215,.35)' }} />

          {/* Capa lejana: motitas borrosas (profundidad) */}
          {flakes.filter((f) => f.layer === 0).map((f, i) => (
            <span key={`f0-${i}`} className="absolute top-0 amb-snow motion-reduce:hidden rounded-full bg-white"
              style={{ left: `${f.left}%`, width: 2.5 + f.seed * 2, height: 2.5 + f.seed * 2,
                filter: 'blur(1px)', ['--o' as string]: '.5',
                ['--d' as string]: `${20 + f.seed * 8}s`, ['--delay' as string]: `${f.delay}s` }} />
          ))}
          {/* Capa media: copos chicos */}
          {flakes.filter((f) => f.layer === 1).map((f, i) => (
            <span key={`f1-${i}`} className="absolute top-0 amb-snow motion-reduce:hidden"
              style={{ left: `${f.left}%`, ['--o' as string]: '.8',
                ['--d' as string]: `${14 + f.seed * 6}s`, ['--delay' as string]: `${f.delay}s` }}>
              <Flake size={10 + f.seed * 7} tone="rgba(236,244,255,.92)" />
            </span>
          ))}
          {/* Capa cercana: copos grandes y nítidos con brillo helado */}
          {flakes.filter((f) => f.layer === 2).map((f, i) => (
            <span key={`f2-${i}`} className="absolute top-0 amb-snow motion-reduce:hidden"
              style={{ left: `${f.left}%`, ['--o' as string]: '.95',
                ['--d' as string]: `${10 + f.seed * 4}s`, ['--delay' as string]: `${f.delay}s`,
                filter: 'drop-shadow(0 0 5px rgba(214,232,255,.75))' }}>
              <Flake size={18 + f.seed * 11} tone="#FFFFFF" />
            </span>
          ))}

          {/* Bancos de niebla helada abajo (dos profundidades que derivan) */}
          <div className="absolute -inset-x-10 -bottom-16 h-48 blur-2xl amb-drift
                          bg-[linear-gradient(to_top,rgba(255,255,255,.65),transparent)]
                          dark:bg-[linear-gradient(to_top,rgba(174,196,240,.16),transparent)]" />
          <div className="absolute -inset-x-16 -bottom-24 h-40 blur-3xl amb-drift-2
                          bg-[linear-gradient(to_top,rgba(224,236,255,.5),transparent)]
                          dark:bg-[linear-gradient(to_top,rgba(140,164,220,.12),transparent)]" />

          {/* Titileo helado en el cielo */}
          {stars.slice(0, 30).map((s, i) => (
            <span key={i} className="absolute rounded-full bg-white theme-twinkle motion-reduce:animate-none"
              style={{ left: `${s.left}%`, top: `${s.top * 0.55}%`, width: Math.max(1.5, s.size - 1), height: Math.max(1.5, s.size - 1),
                animationDelay: `${s.delay}s`, boxShadow: '0 0 6px rgba(214,232,255,.8)' }} />
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
