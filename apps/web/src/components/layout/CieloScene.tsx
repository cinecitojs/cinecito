// apps/web/src/components/layout/CieloScene.tsx
// Escena de "Cielo compartido": un cielo mágico VIVO — capas con parallax de
// profundidad, nubes que cruzan lentamente, estrellas que titilan con variación,
// chispas que ascienden, orbes bokeh flotando con ritmos distintos, blooms de luz
// que respiran y alguna estrella fugaz. Vibra Sanrio/Cinnamoroll premium, sin
// personajes ni assets protegidos. Fija detrás del contenido; respeta
// prefers-reduced-motion (parallax de puntero + clases CSS se desactivan).
import React, { useEffect } from 'react';
import { motion, useReducedMotion, useMotionValue, useSpring, useTransform } from 'motion/react';

// ── Estrellita decorativa (parpadeo con giro por CSS) ────────────────────────
// Compatible con el uso previo: {className, delay, size}. `dur` opcional afina
// la velocidad del parpadeo para dar variación.
export function Twinkle({ className = '', delay = 0, size = 16, dur = 3.2 }:
  { className?: string; delay?: number; size?: number; dur?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      className={`absolute cielo-star pointer-events-none ${className}`}
      style={{ ['--delay' as string]: `${delay}s`, ['--d' as string]: `${dur}s` }}>
      <path d="M12 2.4c.5 3.5 1.9 5.2 5.3 5.9-3.4.7-4.8 2.4-5.3 5.9-.5-3.5-1.9-5.2-5.3-5.9 3.4-.7 4.8-2.4 5.3-5.9Z"
        fill="#9CCAEC" opacity="0.95" />
    </svg>
  );
}

// Campo de estrellas con tamaños/posiciones/ritmos variados.
const STARS = [
  { top: '11%', left: '16%', size: 22, delay: 0.0, dur: 3.4 },
  { top: '8%',  left: '38%', size: 15, delay: 0.9, dur: 4.2 },
  { top: '19%', left: '72%', size: 24, delay: 0.4, dur: 3.0 },
  { top: '26%', left: '24%', size: 13, delay: 1.6, dur: 4.6 },
  { top: '14%', left: '86%', size: 18, delay: 1.1, dur: 3.8 },
  { top: '33%', left: '55%', size: 14, delay: 2.1, dur: 4.0 },
  { top: '41%', left: '9%',  size: 20, delay: 0.6, dur: 3.5 },
  { top: '38%', left: '90%', size: 13, delay: 1.9, dur: 4.4 },
  { top: '52%', left: '34%', size: 16, delay: 0.3, dur: 3.9 },
  { top: '48%', left: '66%', size: 12, delay: 2.4, dur: 4.8 },
  { top: '6%',  left: '58%', size: 12, delay: 1.3, dur: 4.1 },
  { top: '30%', left: '82%', size: 16, delay: 0.8, dur: 3.3 },
  { top: '58%', left: '12%', size: 13, delay: 2.7, dur: 4.5 },
  { top: '62%', left: '78%', size: 11, delay: 1.5, dur: 3.7 },
  { top: '22%', left: '46%', size: 10, delay: 3.0, dur: 5.0 },
  { top: '45%', left: '40%', size: 14, delay: 0.5, dur: 4.3 },
];

// Chispas que ascienden y se desvanecen (partículas brillantes en varias alturas).
const SPARKS = [
  { left: '20%', top: '62%', size: 8,  delay: 0.0, dur: 6.5, tone: '#FFFFFF' },
  { left: '44%', top: '70%', size: 6,  delay: 1.4, dur: 7.4, tone: '#DCEFFB' },
  { left: '68%', top: '58%', size: 9,  delay: 2.2, dur: 6.8, tone: '#FFF6DA' },
  { left: '82%', top: '66%', size: 7,  delay: 3.1, dur: 8.0, tone: '#EBDCF7' },
  { left: '12%', top: '48%', size: 6,  delay: 2.7, dur: 7.0, tone: '#FFFFFF' },
  { left: '56%', top: '44%', size: 8,  delay: 4.0, dur: 7.6, tone: '#DCEFFB' },
  { left: '34%', top: '36%', size: 5,  delay: 1.0, dur: 6.2, tone: '#FFF6DA' },
  { left: '90%', top: '40%', size: 7,  delay: 3.6, dur: 8.2, tone: '#FFFFFF' },
  { left: '28%', top: '52%', size: 7,  delay: 2.0, dur: 7.2, tone: '#EBDCF7' },
  { left: '52%', top: '60%', size: 6,  delay: 4.6, dur: 6.9, tone: '#FFFFFF' },
  { left: '74%', top: '48%', size: 8,  delay: 1.8, dur: 8.4, tone: '#DCEFFB' },
  { left: '6%',  top: '58%', size: 6,  delay: 3.3, dur: 7.8, tone: '#FFF6DA' },
  { left: '62%', top: '34%', size: 5,  delay: 0.7, dur: 6.6, tone: '#FFFFFF' },
  { left: '40%', top: '46%', size: 7,  delay: 5.0, dur: 8.0, tone: '#EBDCF7' },
];

export default function CieloScene() {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 55, damping: 18 });
  const sy = useSpring(my, { stiffness: 55, damping: 18 });
  // Tres profundidades de parallax para dar volumen (más evidente).
  const nearX = useTransform(sx, (v) => v * 46);
  const nearY = useTransform(sy, (v) => v * 28);
  const midX  = useTransform(sx, (v) => v * 22);
  const midY  = useTransform(sy, (v) => v * 14);
  const farX  = useTransform(sx, (v) => v * -26);
  const farY  = useTransform(sy, (v) => v * -16);

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: PointerEvent) => {
      mx.set(e.clientX / window.innerWidth - 0.5);
      my.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduce, mx, my]);

  return (
    <div className="cielo-sky" aria-hidden="true">
      {/* ── Blooms de luz que respiran ── */}
      <div className="absolute left-1/2 -top-40 -translate-x-1/2 w-[46rem] h-[46rem] rounded-full cielo-breathe
                      bg-[radial-gradient(circle,rgba(255,250,224,.85),transparent_62%)]
                      dark:bg-[radial-gradient(circle,rgba(150,196,236,.28),transparent_62%)]" />
      <div className="absolute -right-40 top-1/4 w-[40rem] h-[40rem] rounded-full cielo-breathe-2
                      bg-[radial-gradient(circle,rgba(150,207,244,.55),transparent_64%)]
                      dark:bg-[radial-gradient(circle,rgba(150,140,225,.24),transparent_64%)]" />
      <div className="absolute -left-32 bottom-10 w-[34rem] h-[34rem] rounded-full cielo-breathe
                      bg-[radial-gradient(circle,rgba(198,176,234,.45),transparent_66%)]
                      dark:bg-[radial-gradient(circle,rgba(170,150,230,.20),transparent_66%)]" />

      {/* ── Capa lejana: nubes grandes que cruzan lento (parallax inverso) ── */}
      <motion.div style={{ x: farX, y: farY }} className="absolute inset-0">
        <div className="cielo-cloud cielo-cross top-[8%] -left-48 w-[38rem] h-60" style={{ ['--d' as string]: '95s' }} />
        <div className="cielo-cloud cielo-cross-r top-[28%] -right-56 w-[32rem] h-52" style={{ ['--d' as string]: '120s' }} />
        <div className="cielo-cloud cielo-cross top-[52%] -left-60 w-[28rem] h-48" style={{ ['--d' as string]: '140s' }} />
        <div className="cielo-cloud cielo-cross-r top-[70%] -right-52 w-[26rem] h-44" style={{ ['--d' as string]: '155s' }} />
      </motion.div>

      {/* ── Estrellas titilando con variación ── */}
      {STARS.map((s, i) => (
        <span key={i} className="absolute pointer-events-none" style={{ top: s.top, left: s.left }}>
          <Twinkle size={s.size} delay={s.delay} dur={s.dur} />
        </span>
      ))}

      {/* ── Chispas que ascienden ── */}
      {SPARKS.map((p, i) => (
        <span key={i} className="absolute pointer-events-none cielo-rise"
          style={{ left: p.left, top: p.top, ['--d' as string]: `${p.dur}s`, ['--delay' as string]: `${p.delay}s` }}>
          <span className="block rounded-full"
            style={{ width: p.size, height: p.size, background: p.tone,
              boxShadow: `0 0 ${p.size * 1.6}px ${p.size * 0.6}px ${p.tone}` }} />
        </span>
      ))}

      {/* ── Orbes bokeh flotando con ritmos distintos (capa media, parallax) ── */}
      <motion.div style={{ x: midX, y: midY }} className="absolute inset-0">
        <span className="absolute top-[22%] left-[28%] w-6 h-6 rounded-full bg-white/75 dark:bg-white/25 blur-[2px] cielo-bob"  style={{ ['--d' as string]: '8s' }} />
        <span className="absolute top-[60%] left-[74%] w-8 h-8 rounded-full bg-white/60 dark:bg-white/18 blur-[3px] cielo-bob2" style={{ ['--d' as string]: '12s' }} />
        <span className="absolute top-[46%] left-[52%] w-5 h-5 rounded-full bg-[#FFF6DA]/75 dark:bg-white/18 blur-[1px] cielo-bob"  style={{ ['--d' as string]: '10s' }} />
        <span className="absolute top-[72%] left-[18%] w-7 h-7 rounded-full bg-[#DCEFFB]/65 dark:bg-white/14 blur-[3px] cielo-bob2" style={{ ['--d' as string]: '14s' }} />
        <span className="absolute top-[16%] left-[64%] w-4 h-4 rounded-full bg-[#EBDCF7]/70 dark:bg-white/16 blur-[1px] cielo-bob2" style={{ ['--d' as string]: '9s' }} />
        <span className="absolute top-[54%] left-[38%] w-5 h-5 rounded-full bg-white/55 dark:bg-white/14 blur-[2px] cielo-bob"  style={{ ['--d' as string]: '13s' }} />
      </motion.div>

      {/* ── Capa cercana: nubes esponjosas grandes (parallax fuerte) ── */}
      <motion.div style={{ x: nearX, y: nearY }} className="absolute inset-0">
        <div className="cielo-cloud cielo-cross-r top-[16%] -right-40 w-64 h-28 !blur-2xl" style={{ ['--d' as string]: '80s' }} />
        <div className="cielo-cloud cielo-cross top-[40%] -left-40 w-72 h-32 !blur-2xl" style={{ ['--d' as string]: '95s' }} />
      </motion.div>

      {/* ── Estrella fugaz ocasional ── */}
      <div className="absolute top-[8%] right-[6%] w-24 h-[3px] rounded-full cielo-shoot
                      bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.95))]"
        style={{ ['--d' as string]: '13s', ['--delay' as string]: '3s' }} />
      <div className="absolute top-[18%] right-[24%] w-16 h-[2px] rounded-full cielo-shoot
                      bg-[linear-gradient(90deg,transparent,rgba(220,239,251,.9))]"
        style={{ ['--d' as string]: '17s', ['--delay' as string]: '9s' }} />

      {/* ── Banco de nubes esponjoso (horizonte), con leve flotación ── */}
      <div className="absolute -bottom-24 inset-x-0 h-64">
        {[
          { c: 'left-[-4%] w-56 h-56',  d: '13s' },
          { c: 'left-[15%] w-72 h-72',  d: '16s' },
          { c: 'left-[39%] w-64 h-64',  d: '11s' },
          { c: 'left-[61%] w-80 h-80',  d: '18s' },
          { c: 'right-[-2%] w-60 h-60', d: '14s' },
        ].map((n, i) => (
          <div key={i}
            className={`absolute bottom-0 ${n.c} rounded-full blur-md cielo-bob
                        bg-white/90 dark:bg-[#20233e]/80`}
            style={{ ['--d' as string]: n.d }} />
        ))}
      </div>
    </div>
  );
}
