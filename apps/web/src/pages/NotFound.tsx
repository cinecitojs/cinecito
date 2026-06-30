// apps/web/src/pages/NotFound.tsx — Cielo compartido
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CieloScene from '../components/layout/CieloScene';

export default function NotFound() {
  return (
    <div className="cielo-root relative min-h-[100dvh] flex flex-col items-center justify-center text-center px-5 overflow-hidden">
      <CieloScene />
      <div className="relative z-10 cielo-panel rounded-[2rem] px-8 py-10 max-w-sm w-full">
        <img src="/pocine-dream.png?v=20260630" alt="Pociné durmiendo en una nube"
          className="w-40 h-auto mx-auto mb-4 select-none animate-float motion-reduce:animate-none" draggable={false} />
        <p className="cielo-display font-bold text-6xl cielo-ink-sky leading-none mb-2">404</p>
        <h1 className="cielo-display font-bold text-xl mb-2">Esta función no existe</h1>
        <p className="text-[#54607a] dark:text-[#AEB6D0] mb-7 leading-relaxed">
          Quizá la sala cerró o el enlace cambió. Volvé al inicio y armá una nueva.
        </p>
        <Link to="/"
          className="cielo-cta cielo-display inline-flex items-center justify-center gap-2 h-12 px-7 rounded-full font-semibold">
          <ArrowLeft className="w-5 h-5" /> Volver al inicio
        </Link>
      </div>
    </div>
  );
}
