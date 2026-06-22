// apps/web/src/components/room/OnboardingTour.tsx
// Mini tutorial de bienvenida (onboarding) para quien entra por primera vez.
// Breve, claro, fácil de cerrar y responsive (móvil + escritorio).
// Se reabre desde el botón de ayuda (?) de la sala.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DoorOpen, Play, MessageSquare, Clapperboard, Video, UserPlus,
  ArrowLeft, ArrowRight, X,
} from 'lucide-react';

export const TOUR_SEEN_KEY = 'cinecito_tour_seen_v1';

type Step = {
  icon: React.ReactNode;
  title: string;
  text: string;
};

const STEPS: Step[] = [
  {
    icon: <img src="/pochi.png?v=20260622" alt="" className="w-20 h-20 object-contain" draggable={false} />,
    title: '¡Bienvenido a Cinecito! 🍿',
    text: 'Mirá videos en sincronía con tus amigos, chateá y hacé videollamada. Te muestro lo básico en 20 segundos.',
  },
  {
    icon: <DoorOpen className="w-10 h-10 text-primary" />,
    title: 'Unirte a una sala',
    text: 'Entrá con un código o link, o creá la tuya. Compartí el enlace para que entren tus amigos.',
  },
  {
    icon: <Play className="w-10 h-10 text-primary" />,
    title: 'Reproducir videos',
    text: 'Pegá un link de YouTube, Vimeo, .m3u8 o .mp4 en la cola. Se reproduce sincronizado para todos.',
  },
  {
    icon: <MessageSquare className="w-10 h-10 text-primary" />,
    title: 'Chat y reacciones',
    text: 'Comentá en tiempo real y tocá un emoji para que flote sobre el video. ¡Pura reacción en vivo!',
  },
  {
    icon: <Clapperboard className="w-10 h-10 text-primary" />,
    title: 'Modo cine',
    text: 'Pantalla completa para el video. En el celular o tablet, girá la pantalla y se activa solo. Salís con "Salir de modo cine".',
  },
  {
    icon: <Video className="w-10 h-10 text-primary" />,
    title: 'Videollamada',
    text: 'Sumate a la llamada (hasta 4 en cámara). Activá micrófono y cámara cuando quieras; el resto puede mirar.',
  },
  {
    icon: <UserPlus className="w-10 h-10 text-primary" />,
    title: 'Invitar amigos',
    text: 'Tocá "Invitar" para compartir el link o el código. Cinecito se disfruta mucho más en compañía. 💛',
  },
];

export default function OnboardingTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);

  // Reinicia al primer paso cada vez que se abre.
  useEffect(() => { if (open) setI(0); }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, STEPS.length - 1));
      else if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const step = STEPS[i];
  const isFirst = i === 0;
  const isLast = i === STEPS.length - 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Guía de bienvenida"
    >
      <div
        className="relative w-full sm:max-w-sm bg-surface dark:bg-dark-surface rounded-t-3xl sm:rounded-3xl shadow-cine-lg animate-slide-up sm:animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2 transition-colors z-10"
          aria-label="Cerrar guía"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-6 pt-8 pb-6 text-center">
          <div className="h-24 flex items-center justify-center mb-3">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
              {step.icon}
            </div>
          </div>
          <h2 className="font-display font-bold text-xl mb-2">{step.title}</h2>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed min-h-[3.5rem]">{step.text}</p>
        </div>

        {/* Puntos de progreso */}
        <div className="flex items-center justify-center gap-1.5 pb-4">
          {STEPS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-5 bg-primary' : 'w-1.5 bg-[var(--border)]'}`}
              aria-label={`Ir al paso ${idx + 1}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 px-5 pb-6">
          {isFirst ? (
            <button
              onClick={onClose}
              className="flex-1 h-11 rounded-2xl text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2 transition-colors"
            >
              Saltar
            </button>
          ) : (
            <button
              onClick={() => setI((n) => Math.max(n - 1, 0))}
              className="h-11 px-4 rounded-2xl text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Atrás
            </button>
          )}
          <button
            onClick={() => (isLast ? onClose() : setI((n) => Math.min(n + 1, STEPS.length - 1)))}
            className="flex-1 h-11 rounded-2xl text-sm font-bold bg-primary text-white hover:bg-primary-dark shadow-cine-sm transition-all flex items-center justify-center gap-1.5"
          >
            {isLast ? '¡Listo! 🎬' : <>Siguiente <ArrowRight className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
