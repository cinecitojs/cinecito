// apps/web/src/components/Confetti.tsx
// Confeti ligero y decorativo (pantalla de agradecimiento). Respeta reduce-motion.
import React, { useMemo } from 'react';
import { getSettings } from '../store/useSettings';

const COLORS = ['#6ECBF5', '#FF8FB0', '#C9B6FF', '#FFB845', '#34C77B'];

export default function Confetti({ count = 70, durationMs = 2600 }: { count?: number; durationMs?: number }) {
  const reduce = getSettings().reduceMotion;
  const pieces = useMemo(
    () => Array.from({ length: count }).map((_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      dur: (durationMs / 1000) * (0.7 + Math.random() * 0.7),
      color: COLORS[i % COLORS.length],
      rot: Math.random() * 360,
      size: 6 + Math.random() * 6,
    })),
    [count, durationMs],
  );
  if (reduce) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <span key={i} className="confetti-piece"
          style={{
            left: `${p.left}%`, background: p.color,
            width: `${p.size}px`, height: `${p.size * 1.4}px`,
            animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rot}deg)`,
          }} />
      ))}
    </div>
  );
}
