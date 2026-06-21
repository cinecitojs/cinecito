// apps/web/src/components/room/EmojiPicker.tsx
// Selector de emojis ligero (sin dependencias). El popover se renderiza en un
// PORTAL a document.body con posición fija → escapa de cualquier `overflow`
// y stacking context del panel de chat (era el bug de recorte/z-index).

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Smile } from 'lucide-react';

const EMOJI_GROUPS = [
  { label: '😊', name: 'Caras',  emojis: ['😀','😂','😍','🥰','😎','🤔','😭','😅','🥳','😴','🤩','😜','🤗','😏','🥹'] },
  { label: '👍', name: 'Gestos', emojis: ['👍','👎','👏','🙌','🤝','🫶','❤️','💯','🔥','✨','🎉','🎊','🙏','👀','💪'] },
  { label: '🎬', name: 'Cine',   emojis: ['🎬','🍿','📽️','🎞️','🎭','🎥','📺','🎮','🕹️','🎶','🎵','🎤','🎧','🌟','⭐'] },
  { label: '🐱', name: 'Otros',  emojis: ['💀','🤡','👻','🐱','🐶','🦊','🐼','🐨','🦄','🍕','🍔','🍦','☕','🧋','🥤'] },
];

const PANEL_W = 288;
const PANEL_H = 300;

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [open, setOpen]   = useState(false);
  const [group, setGroup] = useState(0);
  const [pos, setPos]     = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRef   = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const reposition = useCallback(() => {
    const b = btnRef.current?.getBoundingClientRect();
    if (!b) return;
    // Preferir arriba del botón; si no hay espacio, abajo.
    const above = b.top - PANEL_H - 8;
    const top = above >= 8 ? above : Math.min(b.bottom + 8, window.innerHeight - PANEL_H - 8);
    const left = Math.max(8, Math.min(b.right - PANEL_W, window.innerWidth - PANEL_W - 8));
    setPos({ top, left });
  }, []);

  const toggle = () => {
    if (!open) reposition();
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onMove = () => reposition();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open, reposition]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label="Emojis"
        title="Emojis"
        className={`p-2 rounded-xl transition-colors ${
          open ? 'bg-primary/15 text-primary'
               : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2 hover:text-[var(--text)]'
        }`}
      >
        <Smile className="w-5 h-5" />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: PANEL_W, height: PANEL_H, zIndex: 9999 }}
          className="bg-surface dark:bg-dark-surface border border-[var(--border)] rounded-3xl shadow-cine-lg overflow-hidden animate-scale-in flex flex-col"
        >
          <div className="flex border-b border-[var(--border)] px-2 pt-2 pb-1 gap-1">
            {EMOJI_GROUPS.map((g, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setGroup(i)}
                aria-label={g.name}
                title={g.name}
                className={`flex-1 py-1.5 rounded-xl text-base transition-colors
                  ${group === i ? 'bg-primary/15' : 'hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2'}`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="flex-1 p-3 grid grid-cols-6 gap-1 overflow-y-auto content-start">
            {EMOJI_GROUPS[group].emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => { onSelect(emoji); setOpen(false); }}
                className="text-xl p-1.5 rounded-xl hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2 transition-transform active:scale-90"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
