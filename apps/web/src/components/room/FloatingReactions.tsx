// apps/web/src/components/room/FloatingReactions.tsx
// Reacciones flotantes EFÍMERAS sobre el video (#8 pulido de sala).
// - useFloatingReactions(): estado + spawn(), auto-limpieza (no satura memoria/DOM).
// - ReactionsOverlay: capa de animación (pointer-events-none, no interfiere con el video).
// - ReactionBar: barra compacta de emojis para enviar (móvil + escritorio).
// No toca el motor de sincronización: es una capa visual independiente.

import { useCallback, useRef, useState } from 'react';

// Whitelist sincronizada con el backend (socket.ts → REACTION_EMOJIS).
export const REACTION_EMOJIS = ['❤️', '😂', '😮', '👏', '🔥', '😍', '😢', '👍', '🎉', '💯'] as const;

interface FlyingReaction {
  id: number;
  emoji: string;
  left: number;   // % horizontal de partida
  drift: number;  // px de deriva lateral
  scale: number;
}

// Tope de emojis simultáneos en pantalla → nunca satura la UI aunque lluevan reacciones.
const MAX_ON_SCREEN = 24;
const LIFETIME_MS = 2600; // = duración de la animación 'reaction-float'

export function useFloatingReactions() {
  const [items, setItems] = useState<FlyingReaction[]>([]);
  const seq = useRef(0);

  const spawn = useCallback((emoji: string) => {
    if (!REACTION_EMOJIS.includes(emoji as any)) return;
    const id = ++seq.current;
    const item: FlyingReaction = {
      id,
      emoji,
      left: 8 + Math.random() * 84,
      drift: (Math.random() - 0.5) * 60,
      scale: 0.85 + Math.random() * 0.5,
    };
    setItems((prev) => {
      const next = prev.length >= MAX_ON_SCREEN ? prev.slice(prev.length - MAX_ON_SCREEN + 1) : prev;
      return [...next, item];
    });
    setTimeout(() => setItems((prev) => prev.filter((r) => r.id !== id)), LIFETIME_MS);
  }, []);

  return { items, spawn };
}

export function ReactionsOverlay({ items }: { items: FlyingReaction[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-30" aria-hidden>
      {items.map((r) => (
        <span
          key={r.id}
          className="absolute bottom-2 animate-reaction-float select-none will-change-transform"
          style={{
            left: `${r.left}%`,
            fontSize: `${1.6 * r.scale}rem`,
            // deriva lateral leve por reacción (variedad sin tocar el keyframe)
            ['--tw-translate-x' as any]: `${r.drift}px`,
            transform: `translateX(${r.drift}px)`,
            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))',
          }}
        >
          {r.emoji}
        </span>
      ))}
    </div>
  );
}

interface ReactionBarProps {
  onPick: (emoji: string) => void;
  className?: string;
  /** Subconjunto compacto para espacios reducidos (móvil/cine). */
  compact?: boolean;
}

export function ReactionBar({ onPick, className = '', compact = false }: ReactionBarProps) {
  const list = compact ? ['❤️', '😂', '😮', '🔥', '👏', '👍'] : REACTION_EMOJIS;
  return (
    <div
      className={`flex items-center gap-0.5 rounded-full bg-black/40 backdrop-blur-md px-1.5 py-1 border border-white/10 ${className}`}
      role="group"
      aria-label="Enviar reacción"
    >
      {list.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onPick(emoji)}
          className="w-8 h-8 rounded-full text-lg leading-none flex items-center justify-center hover:bg-white/20 active:scale-90 transition-transform"
          aria-label={`Reaccionar ${emoji}`}
          title={`Reaccionar ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
