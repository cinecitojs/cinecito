// apps/web/src/components/room/ThemePreview.tsx
// Miniatura VIVA de un ambiente de sala: misma identidad visual que
// RoomThemeBackdrop pero en versión compacta para las tarjetas de selección.
// Cada decor arma sus capas animadas (nubes, cortinas, copos, pompas…) con
// animaciones escaladas en px para verse bien dentro de un tile pequeño.
// pointer-events:none, decorativo. Respeta prefers-reduced-motion (clases amb-*).
import React from 'react';
import type { ThemeDecor } from '../../lib/roomThemes';

// Puntitos estables por decor (sin random para que no salten entre renders).
const DOTS = [
  { l: 14, t: 20 }, { l: 32, t: 44 }, { l: 52, t: 16 }, { l: 68, t: 52 },
  { l: 82, t: 28 }, { l: 24, t: 66 }, { l: 60, t: 72 }, { l: 90, t: 60 },
  { l: 44, t: 32 }, { l: 76, t: 40 }, { l: 8,  t: 48 }, { l: 38, t: 74 },
  { l: 64, t: 24 }, { l: 92, t: 38 }, { l: 20, t: 34 }, { l: 50, t: 58 },
  { l: 72, t: 68 }, { l: 30, t: 12 },
];

function Stars({ tone = '#fff', glow = false, n = 8 }: { tone?: string; glow?: boolean; n?: number }) {
  return (
    <>
      {DOTS.slice(0, n).map((d, i) => (
        <span key={i} className="absolute rounded-full theme-twinkle motion-reduce:animate-none"
          style={{
            left: `${d.l}%`, top: `${d.t}%`, width: 2 + (i % 3), height: 2 + (i % 3),
            background: tone, animationDelay: `${(i % 5) * 0.5}s`,
            boxShadow: glow ? `0 0 5px ${tone}` : undefined,
          }} />
      ))}
    </>
  );
}

// Copo mini: 6 brazos simples (3 líneas cruzadas) + núcleo. Delicado a 8-12px.
function MiniFlake({ size, tone = '#fff' }: { size: number; tone?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={tone}
      strokeWidth={2} strokeLinecap="round">
      {[0, 60, 120].map((r) => (
        <line key={r} x1="12" y1="3" x2="12" y2="21" transform={`rotate(${r} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="1.4" fill={tone} stroke="none" />
    </svg>
  );
}

// Destellos kawaii flotantes (misma personalidad que el fondo real, en pequeño).
const MINI_SPARK = [
  { l: 22, t: 26, s: 11, drift: 'amb-floaty' as const, d: 6 },
  { l: 70, t: 60, s: 9,  drift: 'amb-floaty-2' as const, d: 7.5 },
  { l: 52, t: 18, s: 7,  drift: 'amb-floaty' as const, d: 9 },
];
function Sparkles({ tone = '#fff', n = 2 }: { tone?: string; n?: number }) {
  return (
    <>
      {MINI_SPARK.slice(0, n).map((s, i) => (
        <span key={i} className={`absolute pointer-events-none ${s.drift} motion-reduce:animate-none`}
          style={{ left: `${s.l}%`, top: `${s.t}%`, ['--d' as string]: `${s.d}s` }}>
          <svg width={s.s} height={s.s} viewBox="0 0 24 24" className="amb-pulse motion-reduce:animate-none"
            style={{ ['--d' as string]: `${3 + i}s`, filter: `drop-shadow(0 0 3px ${tone})` }}>
            <path d="M12 2c.5 3.8 2 5.5 5.6 6.2-3.6.7-5.1 2.4-5.6 6.2-.5-3.8-2-5.5-5.6-6.2C10 7.5 11.5 5.8 12 2Z" fill={tone} opacity="0.92" />
          </svg>
        </span>
      ))}
    </>
  );
}

const SPARK_TONE: Record<ThemeDecor, string> = {
  cotton:   'rgba(255,236,178,0.95)',
  aurora:   'rgba(190,246,228,0.95)',
  starfall: 'rgba(255,255,255,0.95)',
  sunset:   'rgba(255,206,170,0.95)',
  galaxy:   'rgba(224,206,246,0.95)',
  bubbles:  'rgba(210,240,252,0.95)',
  snow:     'rgba(214,236,255,0.95)',
};

export default function ThemePreview({ decor, swatch, className = '' }:
  { decor: ThemeDecor; swatch: string; className?: string }) {
  return (
    <span className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {/* Base de color viva */}
      <span className={`absolute inset-0 bg-gradient-to-br ${swatch}`} />

      {/* Bloom de luz que respira (solo donde la escena lo pide) */}
      {decor !== 'aurora' && decor !== 'starfall' && decor !== 'sunset' && decor !== 'snow' && (
        <span className="absolute left-1/2 -top-4 w-20 h-20 -translate-x-1/2 rounded-full blur-lg amb-glow motion-reduce:animate-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,.7), transparent 62%)' }} />
      )}

      {/* ── Cielo de algodón ── */}
      {decor === 'cotton' && (
        <>
          <span className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(to_top,rgba(255,240,214,.6),transparent)]" />
          <span className="absolute top-[18%] -left-6 w-24 h-10 rounded-full bg-white/85 blur-md amb-mini-drift motion-reduce:animate-none" style={{ ['--d' as string]: '7s' }} />
          <span className="absolute top-[52%] -right-6 w-28 h-11 rounded-full bg-white/75 blur-md amb-mini-drift motion-reduce:animate-none" style={{ ['--d' as string]: '9s', ['--delay' as string]: '1s' }} />
          <Stars tone="rgba(255,236,180,.95)" n={11} />
        </>
      )}

      {/* ── Aurora pastel: cortinas verticales ── */}
      {decor === 'aurora' && (
        <>
          {[
            { l: '8%',  w: 18, tone: 'rgba(118,230,198,.7)',  d: '0s',   skew: '-12deg' },
            { l: '38%', w: 14, tone: 'rgba(168,150,238,.65)', d: '1.4s', skew: '9deg' },
            { l: '62%', w: 20, tone: 'rgba(120,214,232,.6)',  d: '2.6s', skew: '-8deg' },
            { l: '84%', w: 12, tone: 'rgba(238,164,206,.55)', d: '3.6s', skew: '12deg' },
          ].map((c, i) => (
            <span key={i} className="absolute -top-2 h-[72%] blur-md amb-aurora motion-reduce:animate-none rounded-b-full"
              style={{ left: c.l, width: c.w, animationDelay: c.d, transform: `skewX(${c.skew})`,
                background: `linear-gradient(to bottom, ${c.tone}, transparent 88%)` }} />
          ))}
          <span className="absolute inset-x-0 -bottom-3 h-8 blur-md bg-[radial-gradient(60%_100%_at_50%_100%,rgba(130,226,206,.5),transparent)]" />
          <Stars tone="#fff" n={10} />
        </>
      )}

      {/* ── Lluvia de estrellas ── */}
      {decor === 'starfall' && (
        <>
          <span className="absolute -inset-x-4 top-[30%] h-10 blur-md rotate-[-14deg]
                           bg-[linear-gradient(90deg,transparent,rgba(235,240,255,.45)_50%,transparent)]" />
          <Stars tone="#fff" glow n={16} />
          {[16, 42, 70, 30, 58, 86].map((l, i) => (
            <span key={i} className="absolute amb-mini-fall motion-reduce:hidden rounded-full"
              style={{ left: `${l}%`, top: '-10%', width: 2, height: 12,
                background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(210,230,255,.95))',
                ['--d' as string]: `${2.4 + i * 0.5}s`, ['--delay' as string]: `${i * 0.7}s` }} />
          ))}
          <span className="absolute top-2 left-2 w-10 h-[2px] rounded-full amb-mini-shoot motion-reduce:hidden"
            style={{ background: 'linear-gradient(to right, rgba(255,255,255,0), #fff)', filter: 'drop-shadow(0 0 3px rgba(255,255,255,.9))', ['--d' as string]: '4.5s' }} />
        </>
      )}

      {/* ── Atardecer malvavisco: sol bajo + bandas ── */}
      {decor === 'sunset' && (
        <>
          <span className="absolute left-1/2 bottom-[8%] w-16 h-16 -translate-x-1/2 rounded-full blur-sm amb-glow motion-reduce:animate-none"
            style={{ background: 'radial-gradient(circle, rgba(255,224,166,.95) 0%, rgba(255,196,150,.55) 40%, transparent 68%)' }} />
          <span className="absolute -inset-x-3 bottom-[6%] h-6 rounded-full blur-md bg-[linear-gradient(90deg,transparent,rgba(255,196,160,.65),transparent)] amb-mini-drift motion-reduce:animate-none" style={{ ['--d' as string]: '8s' }} />
          <span className="absolute -inset-x-3 bottom-[34%] h-5 rounded-full blur-md bg-[linear-gradient(90deg,transparent,rgba(248,178,196,.55),transparent)] amb-mini-drift motion-reduce:animate-none" style={{ ['--d' as string]: '10s', ['--delay' as string]: '1.2s' }} />
          <span className="absolute bottom-[16%] left-[12%] w-20 h-4 rounded-full blur-[3px] bg-gradient-to-r from-rose-300/70 to-amber-200/60 amb-mini-drift motion-reduce:animate-none" style={{ ['--d' as string]: '9s' }} />
          {[24, 50, 76].map((l, i) => (
            <span key={i} className="absolute bottom-[-8%] amb-mini-rise motion-reduce:hidden rounded-full"
              style={{ left: `${l}%`, width: 4, height: 4,
                background: 'radial-gradient(circle, rgba(255,214,170,.95), transparent 70%)',
                ['--d' as string]: `${3.6 + i * 0.5}s`, ['--delay' as string]: `${i * 0.7}s` }} />
          ))}
          <Stars tone="rgba(255,240,200,.95)" n={7} />
        </>
      )}

      {/* ── Galaxia kawaii: nebulosas + planetita ── */}
      {decor === 'galaxy' && (
        <>
          <span className="absolute -top-3 -left-3 w-20 h-20 rounded-full blur-lg amb-mini-drift motion-reduce:animate-none" style={{ background: 'radial-gradient(circle, rgba(178,142,232,.8), transparent 60%)', ['--d' as string]: '9s' }} />
          <span className="absolute -bottom-4 -right-3 w-20 h-20 rounded-full blur-lg amb-mini-drift motion-reduce:animate-none" style={{ background: 'radial-gradient(circle, rgba(240,158,196,.7), transparent 60%)', ['--d' as string]: '11s', ['--delay' as string]: '1.5s' }} />
          {/* Planetita: círculo + anillo inclinado */}
          <span className="absolute top-[16%] right-[14%] amb-floaty motion-reduce:animate-none" style={{ ['--d' as string]: '10s' }}>
            <svg width="30" height="20" viewBox="0 0 100 62" fill="none">
              <circle cx="50" cy="31" r="20" fill="#B9A4EC" />
              <ellipse cx="50" cy="33" rx="38" ry="10" stroke="rgba(244,208,255,.9)" strokeWidth="6" fill="none" transform="rotate(-16 50 33)" />
              <circle cx="43" cy="26" r="4" fill="rgba(255,255,255,.55)" />
            </svg>
          </span>
          <Stars tone="#fff" glow n={14} />
        </>
      )}

      {/* ── Burbujas de jabón: iridiscentes con wobble ── */}
      {decor === 'bubbles' && (
        <>
          <span className="absolute -top-2 left-[30%] w-10 h-[80%] rotate-[14deg] blur-md
                           bg-[linear-gradient(to_bottom,rgba(255,255,255,.55),transparent_85%)]" />
          {[14, 34, 52, 70, 88, 26, 60].map((l, i) => (
            <span key={i} className="absolute bottom-[-16%] amb-mini-rise motion-reduce:hidden"
              style={{ left: `${l}%`, width: 8 + (i % 4) * 3, height: 8 + (i % 4) * 3,
                ['--d' as string]: `${3.2 + i * 0.5}s`, ['--delay' as string]: `${i * 0.6}s` }}>
              <span className="absolute inset-0 rounded-full amb-wobble motion-reduce:animate-none"
                style={{ ['--d' as string]: `${3 + (i % 3)}s`,
                  background: `radial-gradient(42% 36% at 31% 25%, rgba(255,255,255,.95), rgba(255,255,255,.06) 58%, transparent 68%),
                               conic-gradient(from ${i * 52}deg, rgba(248,182,214,.22), rgba(168,216,250,.26), rgba(186,240,220,.2), rgba(206,190,246,.24), rgba(248,182,214,.22))`,
                  border: '1px solid rgba(255,255,255,.65)',
                  boxShadow: 'inset -2px -3px 5px rgba(244,160,205,.4), inset 2px 3px 5px rgba(140,205,250,.45), 0 0 6px rgba(170,215,250,.5)' }} />
            </span>
          ))}
          <span className="absolute inset-x-0 -bottom-2 h-6 blur-md bg-[linear-gradient(to_top,rgba(255,255,255,.6),transparent)]" />
          <Stars tone="rgba(255,255,255,.85)" n={6} />
        </>
      )}

      {/* ── Copos de nieve: luna + cristales + ráfaga que va y viene ── */}
      {decor === 'snow' && (
        <>
          {/* Luna chiquita con halo doble */}
          <span className="absolute top-[10%] right-[12%] w-8 h-8 rounded-full
                           bg-[radial-gradient(circle_at_38%_34%,#FFFFFF_0%,#E8EEFA_58%,#C9D6F0_100%)]"
            style={{ boxShadow: '0 0 18px rgba(226,236,255,.95), 0 0 36px rgba(190,214,255,.5)' }} />
          {/* Copos base: dos tamaños, caen con vaivén y giro */}
          {[
            { l: 12, s: 9,  d: 4.2, delay: 0 },
            { l: 30, s: 12, d: 3.6, delay: 1.1 },
            { l: 48, s: 8,  d: 4.8, delay: 0.5 },
            { l: 64, s: 13, d: 3.4, delay: 1.8 },
            { l: 80, s: 9,  d: 4.4, delay: 0.2 },
            { l: 22, s: 7,  d: 5.2, delay: 2.4 },
            { l: 56, s: 10, d: 4.0, delay: 2.9 },
            { l: 90, s: 7,  d: 5.0, delay: 1.5 },
          ].map((f, i) => (
            <span key={i} className="absolute top-0 amb-mini-snow motion-reduce:hidden"
              style={{ left: `${f.l}%`, ['--d' as string]: `${f.d}s`, ['--delay' as string]: `${f.delay}s`,
                filter: 'drop-shadow(0 0 4px rgba(170,205,255,.9))' }}>
              <MiniFlake size={f.s} />
            </span>
          ))}
          {/* Ráfaga mini: copos extra que aparecen por lapsos */}
          <span className="absolute inset-0 amb-gust motion-reduce:hidden" style={{ ['--d' as string]: '11s' }}>
            {[
              { l: 20, s: 8,  d: 2.0, delay: 0 },
              { l: 44, s: 10, d: 1.8, delay: 0.6 },
              { l: 70, s: 7,  d: 2.2, delay: 0.3 },
              { l: 86, s: 9,  d: 1.9, delay: 0.9 },
            ].map((f, i) => (
              <span key={i} className="absolute top-0 amb-mini-snow"
                style={{ left: `${f.l}%`, ['--d' as string]: `${f.d}s`, ['--delay' as string]: `${f.delay}s`,
                  filter: 'drop-shadow(0 0 4px rgba(214,232,255,.95))' }}>
                <MiniFlake size={f.s} />
              </span>
            ))}
          </span>
          {/* Niebla helada abajo */}
          <span className="absolute inset-x-0 -bottom-2 h-7 blur-md bg-[linear-gradient(to_top,rgba(255,255,255,.75),transparent)]" />
          <Stars tone="rgba(226,238,255,.9)" glow n={8} />
        </>
      )}

      {/* Destellos flotantes (personalidad kawaii premium, común a todos) */}
      <Sparkles tone={SPARK_TONE[decor]} n={3} />
    </span>
  );
}
