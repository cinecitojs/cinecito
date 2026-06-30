// apps/web/src/components/ui/Pocine.tsx
// Pociné — núcleo de identidad de Cinecito. Una pose por intención, nunca como
// adorno repetido. Las imágenes salen de pochiv2.png (recortadas con cut-pocine.cjs).

import React from 'react';

export type PocinePose = 'hello' | 'empty' | 'celebrate' | 'search' | 'dream' | 'notify';

const SRC: Record<PocinePose, string> = {
  hello:     '/pocine-hello.png?v=2',
  empty:     '/pocine-empty.png?v=2',
  celebrate: '/pocine-celebrate.png?v=2',
  search:    '/pocine-search.png?v=2',
  dream:     '/pocine-dream.png?v=2',
  notify:    '/pocine-notify.png?v=2',
};

const ALT: Record<PocinePose, string> = {
  hello:     'Pociné saludando',
  empty:     'Pociné buscando, sin encontrar nada',
  celebrate: 'Pociné celebrando',
  search:    'Pociné con una lupa, explorando',
  dream:     'Pociné soñando',
  notify:    'Pociné con un aviso',
};

interface PocineProps {
  pose?: PocinePose;
  size?: number | string;
  float?: boolean;        // respiración suave en reposo
  decorative?: boolean;   // aria-hidden (cuando el texto ya cuenta la historia)
  className?: string;
}

export function Pocine({ pose = 'hello', size = 160, float = false, decorative = false, className = '' }: PocineProps) {
  const px = typeof size === 'number' ? `${size}px` : size;
  return (
    <img
      src={SRC[pose]}
      alt={decorative ? '' : ALT[pose]}
      aria-hidden={decorative || undefined}
      draggable={false}
      style={{ width: px, height: 'auto' }}
      className={`select-none ${float ? 'animate-pocine-float motion-reduce:animate-none' : ''} ${className}`}
    />
  );
}
