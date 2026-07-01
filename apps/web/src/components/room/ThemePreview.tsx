// apps/web/src/components/room/ThemePreview.tsx
// Miniatura VIVA de un ambiente de sala: misma lógica visual que
// RoomThemeBackdrop pero en versión compacta para las tarjetas de selección.
// Cada decor arma sus capas animadas (nubes, estrellas, aurora, chispas…) con
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
  aurora:   'rgba(214,238,255,0.95)',
  starfall: 'rgba(255,255,255,0.95)',
  sunset:   'rgba(255,206,170,0.95)',
  galaxy:   'rgba(224,206,246,0.95)',
  bubbles:  'rgba(210,240,252,0.95)',
};

export default function ThemePreview({ decor, swatch, className = '' }:
  { decor: ThemeDecor; swatch: string; className?: string }) {
  return (
    <span className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {/* Base de color viva */}
      <span className={`absolute inset-0 bg-gradient-to-br ${swatch}`} />

      {/* Bloom de luz que respira (común a casi todos) */}
      {decor !== 'aurora' && decor !== 'starfall' && (
        <span className="absolute left-1/2 -top-4 w-20 h-20 -translate-x-1/2 rounded-full blur-lg amb-glow motion-reduce:animate-none"
          style={{ background: decor === 'sunset'
            ? 'radial-gradient(circle, rgba(255,200,170,.75), transparent 62%)'
            : 'radial-gradient(circle, rgba(255,255,255,.7), transparent 62%)' }} />
      )}

      {/* ── Cielo de algodón ── */}
      {decor === 'cotton' && (
        <>
          <span className="absolute top-[18%] -left-6 w-24 h-10 rounded-full bg-white/85 blur-md amb-mini-drift motion-reduce:animate-none" style={{ ['--d' as string]: '7s' }} />
          <span className="absolute top-[52%] -right-6 w-28 h-11 rounded-full bg-white/75 blur-md amb-mini-drift motion-reduce:animate-none" style={{ ['--d' as string]: '9s', ['--delay' as string]: '1s' }} />
          <Stars tone="rgba(255,236,180,.95)" n={11} />
        </>
      )}

      {/* ── Aurora pastel ── */}
      {decor === 'aurora' && (
        <>
          {['from-cyan-300/70 via-sky-200/50 top-[14%]', 'from-violet-300/70 via-fuchsia-200/45 top-[38%]', 'from-rose-300/60 via-pink-200/40 top-[60%]', 'from-emerald-200/60 via-teal-200/40 top-[80%]'].map((g, i) => (
            <span key={i} className={`absolute -inset-x-1/4 h-7 bg-gradient-to-r ${g} to-transparent blur-md amb-aurora motion-reduce:animate-none rounded-full`}
              style={{ animationDelay: `${i * 1.2}s` }} />
          ))}
          <Stars tone="#fff" n={12} />
        </>
      )}

      {/* ── Lluvia de estrellas ── */}
      {decor === 'starfall' && (
        <>
          <Stars tone="#fff" glow n={16} />
          {[16, 42, 70, 30, 58, 86].map((l, i) => (
            <span key={i} className="absolute amb-mini-fall motion-reduce:hidden rounded-full"
              style={{ left: `${l}%`, top: '-10%', width: 2, height: 12,
                background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(210,230,255,.95))',
                ['--d' as string]: `${2.4 + i * 0.5}s`, ['--delay' as string]: `${i * 0.7}s` }} />
          ))}
          <span className="absolute top-2 left-2 w-10 h-[2px] rounded-full amb-mini-shoot motion-reduce:hidden"
            style={{ background: 'linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,.95))', ['--d' as string]: '4.5s' }} />
        </>
      )}

      {/* ── Atardecer malvavisco ── */}
      {decor === 'sunset' && (
        <>
          <span className="absolute top-[24%] -left-6 w-24 h-9 rounded-full bg-gradient-to-br from-white/85 to-rose-200/70 blur-md amb-mini-drift motion-reduce:animate-none" style={{ ['--d' as string]: '8s' }} />
          <span className="absolute top-[54%] -right-6 w-24 h-9 rounded-full bg-gradient-to-br from-white/75 to-amber-100/70 blur-md amb-mini-drift motion-reduce:animate-none" style={{ ['--d' as string]: '10s', ['--delay' as string]: '1s' }} />
          {/* Brasas tibias que suben */}
          {[24, 50, 76].map((l, i) => (
            <span key={i} className="absolute bottom-[-8%] amb-mini-rise motion-reduce:hidden rounded-full"
              style={{ left: `${l}%`, width: 4, height: 4,
                background: 'radial-gradient(circle, rgba(255,214,170,.95), transparent 70%)',
                ['--d' as string]: `${3.6 + i * 0.5}s`, ['--delay' as string]: `${i * 0.7}s` }} />
          ))}
          <Stars tone="rgba(255,240,200,.95)" n={9} />
        </>
      )}

      {/* ── Galaxia kawaii ── */}
      {decor === 'galaxy' && (
        <>
          <span className="absolute -top-3 -left-3 w-20 h-20 rounded-full blur-lg amb-mini-drift motion-reduce:animate-none" style={{ background: 'radial-gradient(circle, rgba(196,166,236,.75), transparent 60%)', ['--d' as string]: '9s' }} />
          <span className="absolute -bottom-4 -right-3 w-20 h-20 rounded-full blur-lg amb-mini-drift motion-reduce:animate-none" style={{ background: 'radial-gradient(circle, rgba(244,176,201,.7), transparent 60%)', ['--d' as string]: '11s', ['--delay' as string]: '1.5s' }} />
          <span className="absolute top-1/2 left-1/2 w-16 h-16 -translate-x-1/2 -translate-y-1/2 rounded-full blur-lg amb-mini-drift motion-reduce:animate-none" style={{ background: 'radial-gradient(circle, rgba(150,180,235,.6), transparent 62%)', ['--d' as string]: '13s', ['--delay' as string]: '3s' }} />
          <Stars tone="#fff" glow n={16} />
        </>
      )}

      {/* ── Burbujas (iridiscentes y mágicas) ── */}
      {decor === 'bubbles' && (
        <>
          <span className="absolute left-1/2 -top-4 w-24 h-24 -translate-x-1/2 rounded-full blur-lg amb-glow motion-reduce:animate-none"
            style={{ background: 'radial-gradient(circle, rgba(210,240,252,.7), transparent 62%)' }} />
          {[14, 34, 52, 70, 88, 26, 60].map((l, i) => (
            <span key={i} className="absolute bottom-[-16%] amb-mini-rise motion-reduce:hidden rounded-full"
              style={{ left: `${l}%`, width: 7 + (i % 4) * 3, height: 7 + (i % 4) * 3,
                background: 'radial-gradient(40% 36% at 32% 26%, rgba(255,255,255,.95), rgba(255,255,255,.06) 58%, transparent 70%), radial-gradient(circle at 72% 74%, rgba(180,224,255,.35), transparent 60%)',
                border: '1px solid rgba(255,255,255,.6)',
                boxShadow: 'inset 0 0 5px rgba(255,255,255,.5), 0 0 6px rgba(190,224,255,.5)',
                ['--d' as string]: `${3.2 + i * 0.5}s`, ['--delay' as string]: `${i * 0.6}s` }} />
          ))}
          <Stars tone="rgba(255,255,255,.85)" n={7} />
        </>
      )}

      {/* Destellos flotantes (personalidad kawaii premium, común a todos) */}
      <Sparkles tone={SPARK_TONE[decor]} n={3} />
    </span>
  );
}
