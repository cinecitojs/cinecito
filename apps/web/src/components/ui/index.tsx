// apps/web/src/components/ui/index.tsx  — FASE 2
// Primitivos de UI reutilizables con identidad Cinecito

import React from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import { Pocine, type PocinePose } from './Pocine';

export { Pocine } from './Pocine';
export type { PocinePose } from './Pocine';

// ── Button ───────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary', size = 'md', loading, children, className = '', disabled, ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-[transform,background-color,border-color,box-shadow,filter] duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]';

  const variants = {
    primary:   'bg-primary-dark text-white hover:brightness-105 shadow-cine-sm hover:shadow-cine',
    secondary: 'bg-surface dark:bg-dark-surface border border-[var(--border)] hover:border-primary text-[var(--text)]',
    ghost:     'hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2 text-[var(--text-muted)] hover:text-[var(--text)]',
    danger:    'bg-[var(--error)] text-white hover:brightness-95 shadow-cine-sm',
  };

  const sizes = {
    sm: 'h-8 px-4 text-xs',
    md: 'h-10 px-5 text-sm',
    lg: 'h-12 px-7 text-base',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

// ── Input ────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, icon, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-semibold text-[var(--text)]">{label}</label>}
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            {icon}
          </span>
        )}
        <input
          className={`w-full py-2.5 rounded-2xl border transition-[border-color,box-shadow] duration-150 ease-out text-sm
            bg-[var(--bg)] dark:bg-dark-surface2
            border-[var(--border)] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30
            ${icon ? 'pl-10 pr-4' : 'px-4'}
            ${error ? 'border-red-400 focus:ring-red-200' : ''}
            ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ── Textarea ─────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}
export function Textarea({ label, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-semibold">{label}</label>}
      <textarea
        className={`w-full px-4 py-2.5 rounded-2xl border border-[var(--border)]
          bg-[var(--bg)] dark:bg-dark-surface2 text-sm resize-none
          focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-[border-color,box-shadow] duration-150 ease-out
          ${className}`}
        {...props}
      />
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}
export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open || typeof document === 'undefined') return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' };
  // Portal a document.body: así el overlay `fixed` SIEMPRE es relativo al viewport
  // y no queda atrapado por un ancestro con transform (p.ej. el FloatingWidget en
  // modo cine, que encajonaba el modal en una franja angosta).
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-[3px]"
      style={{ background: 'rgba(24,26,46,0.55)' }}
      onClick={onClose}
    >
      <div
        className={`bg-surface dark:bg-dark-surface rounded-[24px] border border-[var(--border)] shadow-cine-lg w-full ${widths[size]} max-h-[90vh] overflow-y-auto animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="px-6 pt-5 pb-4 border-b border-[var(--border)] flex items-center justify-between sticky top-0 bg-surface dark:bg-dark-surface z-10">
            <h2 className="font-display font-bold text-lg">{title}</h2>
            <button onClick={onClose} aria-label="Cerrar"
              className="p-1.5 rounded-xl hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

// ── Badge ────────────────────────────────────────────────────
interface BadgeProps {
  color?: 'blue' | 'pink' | 'purple' | 'green' | 'yellow' | 'red';
  children: React.ReactNode;
  className?: string;
}
export function Badge({ color = 'blue', children, className = '' }: BadgeProps) {
  const colors = {
    blue:   'bg-primary/15 text-[var(--primary-dark)] dark:text-primary',
    pink:   'bg-accent/20 text-[var(--accent-fg)]',
    purple: 'bg-secondary/25 text-[var(--secondary-fg)]',
    green:  'bg-[var(--success)]/15 text-[#1F7A57] dark:text-[var(--success)]',
    yellow: 'bg-[var(--marquee)]/20 text-[#8A5A12] dark:text-[var(--marquee)]',
    red:    'bg-[var(--error)]/15 text-[#B23548] dark:text-[var(--error)]',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[color]} ${className}`}>
      {children}
    </span>
  );
}

// ── Tabs / Segmented control ─────────────────────────────────
// Pestaña activa = superficie elevada que "flota" sobre el riel. Limpio y premium.
interface TabsProps {
  tabs: { value: string; label: string; icon?: React.ReactNode }[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}
export function Tabs({ tabs, value, onChange, className = '' }: TabsProps) {
  return (
    <div role="tablist" className={`inline-flex items-center gap-1 p-1 rounded-2xl bg-[var(--surface-2)] dark:bg-dark-surface2 ${className}`}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button key={t.value} type="button" role="tab" aria-selected={active} onClick={() => onChange(t.value)}
            className={`relative inline-flex items-center justify-center gap-1.5 px-3.5 h-9 rounded-xl text-sm font-semibold
              transition-[color,background-color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
              ${active ? 'bg-surface dark:bg-dark-surface text-[var(--text)] shadow-cine-sm' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
            {t.icon}{t.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Chip ─────────────────────────────────────────────────────
interface ChipProps { active?: boolean; onClick?: () => void; children: React.ReactNode; className?: string; }
export function Chip({ active, onClick, children, className = '' }: ChipProps) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-sm font-medium whitespace-nowrap
        transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
        ${active ? 'bg-primary-dark text-white' : 'bg-[var(--surface-2)] dark:bg-dark-surface2 text-[var(--text-muted)] hover:text-[var(--text)]'} ${className}`}>
      {children}
    </button>
  );
}

// ── Switch ───────────────────────────────────────────────────
// Interruptor del design system. Dimensiones FIJAS en px y `shrink-0`:
// el thumb nunca se sale del riel (travel = ancho_riel − ancho_thumb − 2·pad),
// e independiente del flex del contenedor. Proporcional y estable en toda resolución.
interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}
export function Switch({ checked, onChange, label, disabled, id }: SwitchProps) {
  return (
    <button
      type="button" role="switch" id={id}
      aria-checked={checked} aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex shrink-0 h-6 w-11 rounded-full transition-colors duration-200
        outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed
        ${checked ? 'bg-primary' : 'bg-[var(--border)]'}`}
    >
      <span aria-hidden
        className={`pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm
          transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

// ── Spinner ──────────────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sz = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className={`${sz[size]} animate-spin text-primary`} />
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────
// Carga con la FORMA del contenido final (no un spinner en el centro).
// Componer varios para reconstruir tarjetas/listas mientras llega el dato.
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-2xl bg-[var(--surface-2)] dark:bg-dark-surface2 ${className}`}
    />
  );
}

// ── EmptyState ───────────────────────────────────────────────
// Pociné aparece cuando no hay nada que mostrar. Enseña, no decora.
interface EmptyStateProps {
  pose?: PocinePose;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}
export function EmptyState({ pose = 'empty', title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`relative overflow-hidden rounded-[24px] border border-[var(--border)] bg-surface dark:bg-dark-surface px-6 py-14 flex flex-col items-center text-center ${className}`}>
      <div className="pointer-events-none absolute inset-x-0 -top-8 h-44 bg-gradient-to-b from-primary/10 to-transparent" aria-hidden="true" />
      <Pocine pose={pose} size={148} float decorative className="relative mb-4" />
      <h3 className="relative font-display font-bold text-lg sm:text-xl">{title}</h3>
      {description && <p className="relative text-sm text-[var(--text-muted)] mt-2 max-w-xs leading-relaxed">{description}</p>}
      {action && <div className="relative mt-5">{action}</div>}
    </div>
  );
}

// ── Loader (con Pociné soñando) ──────────────────────────────
const LOADING_LINES = [
  'Acomodando las luces…',
  'Buscando tu butaca…',
  'Encendiendo la función…',
  'Estirando la pantalla…',
];
export function Loader({ label, pose = 'dream' }: { label?: string; pose?: PocinePose }) {
  const line = React.useMemo(() => label ?? LOADING_LINES[Math.floor(Math.random() * LOADING_LINES.length)], [label]);
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-4 text-center">
      <Pocine pose={pose} size={104} float decorative />
      <div className="flex items-center gap-1.5" aria-hidden="true">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pocine-dot" />
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pocine-dot [animation-delay:160ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pocine-dot [animation-delay:320ms]" />
      </div>
      <p className="text-sm text-[var(--text-muted)]">{line}</p>
    </div>
  );
}

// ── Avatar ───────────────────────────────────────────────────
const PALETTE = ['#7E8AE6','#C0AEE8','#F4B0C9','#8FD3C4','#F2CE86','#9DB4F0','#D9A8E8','#7FC8E0'];

function nameToColor(name: string) {
  let hash = 0;
  for (const c of (name || '?')) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

interface AvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  online?: boolean;
  src?: string | null;
  className?: string;
}
export function Avatar({ name, size = 'sm', online, src, className = '' }: AvatarProps) {
  const sz = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
  };
  return (
    <div className={`relative shrink-0 ${className}`}>
      {src ? (
        <img src={src} alt={name}
          className={`${sz[size]} rounded-full object-cover`} />
      ) : (
        <div
          className={`${sz[size]} rounded-full flex items-center justify-center text-white font-bold`}
          style={{ background: nameToColor(name) }}
        >
          {(name || '?').charAt(0).toUpperCase()}
        </div>
      )}
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-online border-2 border-surface dark:border-dark-surface" />
      )}
    </div>
  );
}

// ── Toast message ────────────────────────────────────────────
// Usamos un sistema propio simple en lugar de agregar dependencias
let _addToast: ((msg: string, type?: 'success' | 'error' | 'info') => void) | null = null;

export function ToastContainer() {
  const [toasts, setToasts] = React.useState<{ id: number; msg: string; type: string }[]>([]);

  React.useEffect(() => {
    _addToast = (msg, type = 'info') => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, msg, type }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
    };
    return () => { _addToast = null; };
  }, []);

  const dot = {
    success: 'var(--success)',
    error:   'var(--error)',
    info:    'var(--primary)',
  };

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id}
          className="flex items-center gap-2.5 bg-[var(--text)] text-[var(--bg)] text-sm font-medium pl-3.5 pr-4 py-3 rounded-2xl shadow-cine-lg animate-slide-right pointer-events-auto max-w-xs">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot[t.type as keyof typeof dot] || dot.info }} aria-hidden="true" />
          {t.msg}
        </div>
      ))}
    </div>
  );
}

export function toast(msg: string, type: 'success' | 'error' | 'info' = 'info') {
  _addToast?.(msg, type);
}
