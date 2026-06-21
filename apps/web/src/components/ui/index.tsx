// apps/web/src/components/ui/index.tsx  — FASE 2
// Primitivos de UI reutilizables con identidad Cinecito

import React from 'react';
import { Loader2 } from 'lucide-react';

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
  const base = 'inline-flex items-center justify-center gap-2 font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95';

  const variants = {
    primary:   'bg-primary text-white hover:bg-primary-dark shadow-cine-sm hover:shadow-cine',
    secondary: 'bg-surface dark:bg-dark-surface border-2 border-[var(--border)] hover:border-primary text-[var(--text)]',
    ghost:     'hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2 text-[var(--text-muted)] hover:text-[var(--text)]',
    danger:    'bg-red-500 text-white hover:bg-red-600 shadow-sm',
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
          className={`w-full py-2.5 rounded-2xl border transition-all text-sm
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
          focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all
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
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className={`bg-surface dark:bg-dark-surface rounded-3xl shadow-cine-lg w-full ${widths[size]} animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="px-6 pt-5 pb-4 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="font-bold text-lg">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-[var(--surface-2)] text-[var(--text-muted)] transition-colors">
              ✕
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
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
    blue:   'bg-primary/15 text-primary-dark dark:text-primary',
    pink:   'bg-secondary/20 text-pink-600 dark:text-pink-300',
    purple: 'bg-accent/20 text-purple-600 dark:text-purple-300',
    green:  'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    red:    'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[color]} ${className}`}>
      {children}
    </span>
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

// ── Avatar ───────────────────────────────────────────────────
const PALETTE = ['#6ECBF5','#FFB8D0','#D4B8FF','#68D391','#F6AD55','#FC8181','#63B3ED','#B794F4'];

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

  const colors = {
    success: 'bg-green-600',
    error:   'bg-red-500',
    info:    'bg-dark-bg dark:bg-dark-surface',
  };

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id}
          className={`${colors[t.type as keyof typeof colors] || colors.info} text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-cine-lg animate-slide-right pointer-events-auto max-w-xs`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

export function toast(msg: string, type: 'success' | 'error' | 'info' = 'info') {
  _addToast?.(msg, type);
}
