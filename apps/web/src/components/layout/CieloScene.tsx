// apps/web/src/components/layout/CieloScene.tsx
// Escena de cielo compartida (identidad "Cielo compartido"): nubes en capas con
// profundidad + parallax de puntero, luz suave y un banco de nubes esponjoso
// abajo (vibra Sanrio/Cinnamoroll). Fija detrás del contenido. Reutilizable en
// Landing y en todo el funnel público. Respeta prefers-reduced-motion.
import React, { useEffect } from 'react';
import { motion, useReducedMotion, useMotionValue, useSpring, useTransform } from 'motion/react';

// Estrellita decorativa (parpadeo lento por CSS)
export function Twinkle({ className = '', delay = 0, size = 16 }:
  { className?: string; delay?: number; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      className={`absolute cielo-star pointer-events-none ${className}`} style={{ animationDelay: `${delay}s` }}>
      <path d="M12 2.4c.5 3.5 1.9 5.2 5.3 5.9-3.4.7-4.8 2.4-5.3 5.9-.5-3.5-1.9-5.2-5.3-5.9 3.4-.7 4.8-2.4 5.3-5.9Z"
        fill="#9CCAEC" opacity="0.95" />
    </svg>
  );
}

export default function CieloScene() {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 55, damping: 18 });
  const sy = useSpring(my, { stiffness: 55, damping: 18 });
  const nearX = useTransform(sx, (v) => v * 24);
  const nearY = useTransform(sy, (v) => v * 14);
  const farX  = useTransform(sx, (v) => v * -13);
  const farY  = useTransform(sy, (v) => v * -8);

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
      {/* luz suave del cielo (sol que asoma) */}
      <div className="absolute left-1/2 -top-32 -translate-x-1/2 w-[42rem] h-[42rem] rounded-full
                      bg-[radial-gradient(circle,rgba(255,247,224,.75),transparent_62%)]
                      dark:bg-[radial-gradient(circle,rgba(143,194,234,.20),transparent_62%)]" />

      {/* nubes lejanas (capa de fondo, parallax inverso) */}
      <motion.div style={{ x: farX, y: farY }} className="absolute inset-0">
        <div className="absolute top-[12%] left-[-7rem] w-[28rem] h-44 rounded-full bg-white/55 dark:bg-white/[0.05] blur-2xl cielo-drift2" />
        <div className="absolute top-[30%] right-[-6rem] w-[24rem] h-40 rounded-full bg-white/45 dark:bg-white/[0.04] blur-2xl cielo-drift" />
      </motion.div>

      {/* destellos */}
      <Twinkle className="top-[15%] left-[18%]" size={18} delay={0.2} />
      <Twinkle className="top-[23%] right-[22%]" size={14} delay={1} />
      <Twinkle className="top-[42%] left-[10%]" size={12} delay={1.6} />
      <Twinkle className="top-[9%] right-[38%]" size={16} delay={0.6} />

      {/* nubes cercanas (capa frontal, parallax) */}
      <motion.div style={{ x: nearX, y: nearY }} className="absolute inset-0">
        <div className="absolute top-[7%] left-[10%] w-60 h-24 rounded-full bg-white/75 dark:bg-white/[0.06] blur-xl cielo-drift" />
        <div className="absolute top-[33%] right-[8%] w-64 h-28 rounded-full bg-white/65 dark:bg-white/[0.05] blur-xl cielo-drift2" />
      </motion.div>

      {/* banco de nubes esponjoso (horizonte) */}
      <div className="absolute -bottom-20 inset-x-0 h-60">
        {['left-[-4%] w-56 h-56', 'left-[15%] w-72 h-72', 'left-[39%] w-64 h-64',
          'left-[61%] w-80 h-80', 'right-[-2%] w-60 h-60'].map((c, i) => (
          <div key={i} className={`absolute bottom-0 ${c} rounded-full bg-white/85 dark:bg-[#20233e]/75 blur-md`} />
        ))}
      </div>
    </div>
  );
}
