// apps/web/src/components/FloatingWidget.tsx
// Widget flotante PiP: arrastrable, REDIMENSIONABLE desde las 4 esquinas (handles
// sutiles), con TAP en la barra que cicla 3 tamaños predefinidos, y posición +
// tamaño + estado recordados en localStorage. Reutilizable (Chat, Llamada, etc.).

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GripVertical, Minus, X, Maximize2 } from 'lucide-react';

type Corner = 'nw' | 'ne' | 'sw' | 'se';
interface Size { w: number; h: number }
interface WidgetState { x: number; y: number; w: number; h: number; collapsed: boolean; preset: number }

interface FloatingWidgetProps {
  id: string;
  title: string;
  icon?: React.ReactNode;
  accentClass?: string;
  defaultPos: { x: number; y: number };
  width?: number;            // ancho inicial
  bodyHeight?: number;       // alto inicial del cuerpo
  minWidth?: number;
  minHeight?: number;
  sizePresets?: Size[];      // 3 tamaños que cicla el tap (chico → mediano-chico → mediano)
  centerBody?: boolean;      // centra el contenido (para la videollamada)
  onClose?: () => void;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}

const clampNum = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));
const TAP_THRESHOLD = 5; // px: por debajo es "tap", por encima es "arrastre"

function loadState(id: string, def: WidgetState): WidgetState {
  try {
    const raw = localStorage.getItem(`cinecito_widget_${id}`);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        x: typeof p.x === 'number' ? p.x : def.x,
        y: typeof p.y === 'number' ? p.y : def.y,
        w: typeof p.w === 'number' ? p.w : def.w,
        h: typeof p.h === 'number' ? p.h : def.h,
        collapsed: !!p.collapsed,
        preset: typeof p.preset === 'number' ? p.preset : -1,
      };
    }
  } catch { /* */ }
  return def;
}

export default function FloatingWidget({
  id, title, icon, accentClass = 'border-[var(--border)]', defaultPos,
  width = 300, bodyHeight, minWidth = 200, minHeight = 150,
  sizePresets, centerBody, onClose, headerExtra, children,
}: FloatingWidgetProps) {
  const presets: Size[] = sizePresets ?? [
    { w: 220, h: 200 }, { w: 300, h: 320 }, { w: 380, h: 440 },
  ];
  const def: WidgetState = { x: defaultPos.x, y: defaultPos.y, w: width, h: bodyHeight ?? 300, collapsed: false, preset: -1 };
  const [state, setState] = useState<WidgetState>(() => loadState(id, def));
  const ref    = useRef<HTMLDivElement>(null);
  const drag   = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const resize = useRef<{ corner: Corner; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number } | null>(null);

  const persist = useCallback((s: WidgetState) => {
    try { localStorage.setItem(`cinecito_widget_${id}`, JSON.stringify(s)); } catch { /* */ }
  }, [id]);

  const maxW = () => Math.max(minWidth, (typeof window !== 'undefined' ? window.innerWidth : 1024) - 16);
  const maxH = () => Math.max(minHeight, (typeof window !== 'undefined' ? window.innerHeight : 768) - 120);

  const clampPos = useCallback((x: number, y: number, w?: number, h?: number) => {
    const ww = w ?? ref.current?.offsetWidth ?? state.w;
    const hh = h ?? ref.current?.offsetHeight ?? 0;
    return {
      x: clampNum(x, 8, Math.max(8, window.innerWidth - ww - 8)),
      y: clampNum(y, 60, Math.max(60, window.innerHeight - hh - 8)),
    };
  }, [state.w]);

  // ── Barra: arrastrar (mover) o TAP (ciclar tamaño) ──
  const onHeaderDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    drag.current = { sx: e.clientX, sy: e.clientY, ox: state.x, oy: state.y, moved: false };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const onHeaderMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.sx, dy = e.clientY - drag.current.sy;
    if (!drag.current.moved && Math.hypot(dx, dy) > TAP_THRESHOLD) drag.current.moved = true;
    if (drag.current.moved) {
      const c = clampPos(drag.current.ox + dx, drag.current.oy + dy);
      setState((s) => ({ ...s, x: c.x, y: c.y }));
    }
  };
  const onHeaderUp = () => {
    if (!drag.current) return;
    const moved = drag.current.moved;
    drag.current = null;
    if (moved) { setState((s) => { persist(s); return s; }); }
    else { cycleSize(); }
  };

  const cycleSize = () => setState((s) => {
    if (s.collapsed) { const n = { ...s, collapsed: false }; persist(n); return n; } // tap estando minimizado → expande
    const next = ((s.preset < 0 ? -1 : s.preset) + 1) % presets.length; // 1er tap → 0 (el más chico)
    const p = presets[next];
    const w = clampNum(p.w, minWidth, maxW());
    const h = clampNum(p.h, minHeight, maxH());
    const c = clampPos(s.x, s.y, w, h);
    const n = { ...s, w, h, preset: next, ...c };
    persist(n); return n;
  });

  // ── Esquinas: redimensionar (manual, en cualquier momento) ──
  const onCornerDown = (corner: Corner) => (e: React.PointerEvent) => {
    e.stopPropagation();
    resize.current = { corner, sx: e.clientX, sy: e.clientY, ox: state.x, oy: state.y, ow: state.w, oh: state.h };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const onCornerMove = (e: React.PointerEvent) => {
    if (!resize.current) return;
    const { corner, sx, sy, ox, oy, ow, oh } = resize.current;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    let w = ow, h = oh, x = ox, y = oy;
    if (corner === 'se') { w = ow + dx; h = oh + dy; }
    else if (corner === 'sw') { w = ow - dx; h = oh + dy; }
    else if (corner === 'ne') { w = ow + dx; h = oh - dy; }
    else { w = ow - dx; h = oh - dy; } // nw
    w = clampNum(w, minWidth, maxW());
    h = clampNum(h, minHeight, maxH());
    if (corner === 'sw' || corner === 'nw') x = ox + (ow - w); // borde derecho fijo
    if (corner === 'ne' || corner === 'nw') y = oy + (oh - h); // borde inferior fijo
    x = clampNum(x, 8, window.innerWidth - 40);
    y = clampNum(y, 50, window.innerHeight - 40);
    setState((s) => ({ ...s, x, y, w, h, preset: -1 }));
  };
  const onCornerUp = () => {
    if (!resize.current) return;
    resize.current = null;
    setState((s) => { persist(s); return s; });
  };

  // Mantener dentro del viewport al redimensionar/rotar la ventana.
  useEffect(() => {
    const onResizeWin = () => setState((s) => {
      const w = clampNum(s.w, minWidth, maxW());
      const h = clampNum(s.h, minHeight, maxH());
      const c = clampPos(s.x, s.y, w, h);
      return { ...s, w, h, ...c };
    });
    window.addEventListener('resize', onResizeWin);
    return () => window.removeEventListener('resize', onResizeWin);
  }, [clampPos, minWidth, minHeight]);

  const toggleCollapse = () => setState((s) => { const n = { ...s, collapsed: !s.collapsed }; persist(n); return n; });

  const corners: { c: Corner; pos: string; cursor: string; bracket: string }[] = [
    { c: 'nw', pos: 'top-0 left-0',     cursor: 'nwse-resize', bracket: 'top-1 left-1 border-t-2 border-l-2 rounded-tl' },
    { c: 'ne', pos: 'top-0 right-0',    cursor: 'nesw-resize', bracket: 'top-1 right-1 border-t-2 border-r-2 rounded-tr' },
    { c: 'sw', pos: 'bottom-0 left-0',  cursor: 'nesw-resize', bracket: 'bottom-1 left-1 border-b-2 border-l-2 rounded-bl' },
    { c: 'se', pos: 'bottom-0 right-0', cursor: 'nwse-resize', bracket: 'bottom-1 right-1 border-b-2 border-r-2 rounded-br' },
  ];

  return (
    <div ref={ref}
      style={{ position: 'fixed', left: state.x, top: state.y, width: state.w, zIndex: 45 }}
      className={`group bg-surface dark:bg-dark-surface border ${accentClass} rounded-2xl shadow-cine-lg overflow-hidden flex flex-col animate-scale-in`}>
      <div
        onPointerDown={onHeaderDown} onPointerMove={onHeaderMove} onPointerUp={onHeaderUp} onPointerCancel={onHeaderUp}
        title="Arrastrá para mover · tocá para cambiar el tamaño"
        className="flex items-center gap-1.5 px-2.5 py-2 bg-[var(--surface-2)] dark:bg-dark-surface2 cursor-move select-none touch-none">
        <GripVertical className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" aria-hidden />
        {icon}
        <span className="text-xs font-semibold truncate">{title}</span>
        <div className="ml-auto flex items-center gap-0.5">
          {headerExtra}
          <button onClick={toggleCollapse} aria-label={state.collapsed ? 'Expandir' : 'Minimizar'} title={state.collapsed ? 'Expandir' : 'Minimizar'}
            className="p-1 rounded-lg hover:bg-[var(--surface)] dark:hover:bg-dark-surface text-[var(--text-muted)] transition-colors">
            {state.collapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
          </button>
          {onClose && (
            <button onClick={onClose} aria-label="Ocultar" title="Ocultar"
              className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-[var(--text-muted)] hover:text-red-500 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {!state.collapsed && (
        <div className={`min-h-0 overflow-y-auto overscroll-contain ${centerBody ? 'flex items-center justify-center' : ''}`} style={{ height: state.h }}>
          {children}
        </div>
      )}

      {/* Handles de resize en las 4 esquinas: zona de agarre invisible + bracket sutil al hover. */}
      {!state.collapsed && corners.map(({ c, pos, cursor, bracket }) => (
        <div key={c}
          onPointerDown={onCornerDown(c)} onPointerMove={onCornerMove} onPointerUp={onCornerUp} onPointerCancel={onCornerUp}
          role="separator" aria-label={`Redimensionar (${c})`}
          className={`absolute ${pos} w-5 h-5 touch-none z-10`} style={{ cursor }}>
          <span className={`absolute ${bracket} w-2 h-2 border-primary/70 opacity-0 group-hover:opacity-100 transition-opacity`} />
        </div>
      ))}
    </div>
  );
}
