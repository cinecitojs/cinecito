// apps/web/src/components/room/CountdownOverlay.tsx
// Cuenta regresiva cinematográfica 3·2·1·¡Play! sobre el video.
// Sincronizada por el reloj del servidor: recibe `startAt` (epoch del server) y
// `serverOffset` (serverNow = Date.now() + serverOffset) → todos los
// participantes ven el mismo conteo alineado, sin tocar el motor de sync.
// Se muestra sobre el VideoStage (StageWithReactions) y se cierra sola.

import { useEffect, useRef, useState } from 'react';

interface Props {
  startAt: number;       // epoch del servidor en el que arranca el video
  durationMs: number;    // ventana total del conteo (server)
  serverOffset: number;  // serverNow ≈ Date.now() + serverOffset
  onDone: () => void;
}

export default function CountdownOverlay({ startAt, durationMs, serverOffset, onDone }: Props) {
  const [remaining, setRemaining] = useState(() => startAt - (Date.now() + serverOffset));
  const doneRef = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setRemaining(startAt - (Date.now() + serverOffset));
    }, 80);
    return () => clearInterval(id);
  }, [startAt, serverOffset]);

  // Tras el "¡Play!" (≈700ms después del 0) se cierra y revela el video.
  useEffect(() => {
    if (remaining <= -700 && !doneRef.current) { doneRef.current = true; onDone(); }
  }, [remaining, onDone]);

  const per = Math.max(1, durationMs / 3);
  const counting = remaining > 0;
  const number = Math.min(3, Math.max(1, Math.ceil(remaining / per)));

  return (
    <div
      aria-hidden
      data-countdown={counting ? number : 'play'}
      className={`absolute inset-0 z-40 flex items-center justify-center pointer-events-none overflow-hidden rounded-3xl
        transition-colors duration-500 ${counting ? 'bg-black/70 backdrop-blur-[2px]' : 'bg-black/0'}`}
    >
      {counting ? (
        <div key={number} className="relative flex items-center justify-center animate-scale-in">
          <span className="absolute w-28 h-28 sm:w-40 sm:h-40 rounded-full border-2 border-primary/70" />
          <span className="absolute w-28 h-28 sm:w-40 sm:h-40 rounded-full border-4 border-primary/20 animate-ping" />
          <span className="font-display font-extrabold text-white text-6xl sm:text-8xl tabular-nums drop-shadow-[0_4px_24px_rgba(110,203,245,0.65)]">
            {number}
          </span>
        </div>
      ) : (
        <span key="play" className="font-display font-extrabold text-white text-4xl sm:text-6xl animate-scale-in drop-shadow-[0_4px_24px_rgba(110,203,245,0.65)]">
          ¡Play! 🎬
        </span>
      )}
    </div>
  );
}
