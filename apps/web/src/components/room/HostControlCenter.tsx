// apps/web/src/components/room/HostControlCenter.tsx
// Centro de control de sala — panel premium deslizable (drawer derecho en desktop,
// full-width en móvil). Organiza los controles REALES del anfitrión + la
// personalización de ambiente (por dispositivo). No toca la lógica de tiempo real:
// recibe handlers ya cableados desde Room.tsx.
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Sparkles, SlidersHorizontal, Crown, Users, PlayCircle, ShieldCheck,
  Copy, Check, RotateCcw, CornerDownRight, Lock, Globe, Mail, Hammer, Info,
} from 'lucide-react';
import { ROOM_THEMES } from '../../lib/roomThemes';
import { PermissionsPanel } from './index';
import type { RoomPermissions } from '../../hooks/useSocket';

type TabKey = 'resumen' | 'ambiente' | 'reproduccion' | 'permisos' | 'gente';

interface Props {
  open: boolean;
  onClose: () => void;
  roomName: string;
  code: string;
  privacy: 'public' | 'private' | 'invite';
  onlineCount: number;
  isHost: boolean;
  hasVideo: boolean;
  onRestartAll: () => void;
  onSeekTo: (seconds: number) => void;
  permissions: RoomPermissions;
  onChangePermissions: (next: RoomPermissions) => void;
  ambiance: string | null;
  onAmbiance: (id: string | null) => void;
  participantsSlot?: React.ReactNode;
  pendingRequests?: number;
  onOpenRequests?: () => void;
}

const PRIVACY: Record<Props['privacy'], { label: string; icon: typeof Lock }> = {
  public:  { label: 'Pública',         icon: Globe },
  private: { label: 'Privada',         icon: Lock },
  invite:  { label: 'Solo invitación', icon: Mail },
};

const SECTION = 'rounded-2xl bg-[var(--surface-2)] dark:bg-dark-surface2 p-4';

export default function HostControlCenter(p: Props) {
  const [tab, setTab] = useState<TabKey>('resumen');
  const [copied, setCopied] = useState(false);
  const [mm, setMm] = useState('');
  const [ss, setSs] = useState('');

  const allTabs: { key: TabKey; label: string; icon: typeof Crown; host?: boolean }[] = [
    { key: 'resumen',      label: 'Resumen',   icon: Info },
    { key: 'ambiente',     label: 'Ambiente',  icon: Sparkles },
    { key: 'reproduccion', label: 'Video',     icon: PlayCircle, host: true },
    { key: 'permisos',     label: 'Permisos',  icon: ShieldCheck, host: true },
    { key: 'gente',        label: 'Gente',     icon: Users,      host: true },
  ];
  const tabs = allTabs.filter((t) => !t.host || p.isHost);

  const Priv = PRIVACY[p.privacy];

  const copyCode = () => {
    navigator.clipboard.writeText(p.code);
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };

  const doSeek = () => {
    const secs = (parseInt(mm || '0', 10) * 60) + parseInt(ss || '0', 10);
    if (!Number.isFinite(secs) || secs < 0) return;
    p.onSeekTo(secs);
  };

  const ambiances = [
    { id: null as string | null, name: 'Ninguno', swatch: 'from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800' },
    ...ROOM_THEMES.map((t) => ({ id: t.id, name: t.name, swatch: t.swatch })),
  ];

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {p.open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={p.onClose}
            className="fixed inset-0 z-[60] bg-[#16203a]/45 backdrop-blur-[2px]" aria-hidden="true" />

          <motion.aside
            role="dialog" aria-label="Centro de control de la sala"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="fixed top-0 right-0 z-[61] h-[100dvh] w-full sm:w-[420px] max-w-full
                       bg-[var(--surface)] dark:bg-dark-surface border-l border-[var(--border)] shadow-cine-lg
                       flex flex-col">
            {/* Header */}
            <div className="shrink-0 flex items-center gap-2.5 px-5 h-16 border-b border-[var(--border)]">
              <span className="grid place-items-center w-9 h-9 rounded-2xl bg-primary/15 text-[var(--primary-dark)] dark:text-primary">
                <SlidersHorizontal className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="font-display font-bold leading-tight">Centro de control</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{p.roomName}</p>
              </div>
              <button onClick={p.onClose}
                className="ml-auto p-2 rounded-xl hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2 text-[var(--text-muted)] transition-colors"
                aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="shrink-0 flex gap-1 px-3 py-2.5 overflow-x-auto border-b border-[var(--border)]">
              {tabs.map(({ key, label, icon: Icon }) => {
                const active = tab === key;
                return (
                  <button key={key} onClick={() => setTab(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors
                      ${active ? 'bg-primary text-white' : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2'}`}>
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                );
              })}
            </div>

            {/* Contenido */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              {/* ── Resumen ── */}
              {tab === 'resumen' && (
                <>
                  <div className={SECTION}>
                    <p className="text-xs font-semibold text-[var(--text-muted)] mb-1.5">Sala</p>
                    <p className="font-display font-bold text-lg leading-tight">{p.roomName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={SECTION}>
                      <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">Código</p>
                      <button onClick={copyCode}
                        className="flex items-center gap-2 font-mono font-bold tracking-wider text-[var(--primary-dark)] dark:text-primary">
                        {p.code}
                        {copied ? <Check className="w-4 h-4 text-[var(--success)]" /> : <Copy className="w-4 h-4 opacity-70" />}
                      </button>
                    </div>
                    <div className={SECTION}>
                      <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">Privacidad</p>
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                        <Priv.icon className="w-4 h-4 text-[var(--primary-dark)] dark:text-primary" /> {Priv.label}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`${SECTION} flex items-center gap-2.5`}>
                      <span className="online-dot" />
                      <div>
                        <p className="font-display font-bold text-lg leading-none">{p.onlineCount}</p>
                        <p className="text-xs text-[var(--text-muted)]">conectados</p>
                      </div>
                    </div>
                    <div className={`${SECTION} flex items-center gap-2.5`}>
                      <Crown className={`w-5 h-5 ${p.isHost ? 'text-marquee' : 'text-[var(--text-muted)]'}`} />
                      <p className="text-sm font-semibold">{p.isHost ? 'Sos el anfitrión' : 'Espectador'}</p>
                    </div>
                  </div>
                  {p.isHost && (p.pendingRequests ?? 0) > 0 && p.onOpenRequests && (
                    <button onClick={p.onOpenRequests}
                      className="w-full flex items-center gap-2.5 p-3.5 rounded-2xl bg-secondary/15 border border-secondary/30 text-left hover:-translate-y-0.5 transition-transform">
                      <Mail className="w-5 h-5 text-[var(--secondary-fg)] dark:text-secondary shrink-0" />
                      <span className="text-sm font-semibold flex-1">
                        {p.pendingRequests} solicitud{(p.pendingRequests ?? 0) === 1 ? '' : 'es'} de acceso
                      </span>
                      <CornerDownRight className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                  )}
                </>
              )}

              {/* ── Ambiente (personalización por dispositivo) ── */}
              {tab === 'ambiente' && (
                <>
                  <div className="flex items-start gap-2 text-xs text-[var(--text-muted)] px-1 mb-1">
                    <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--primary-dark)] dark:text-primary" />
                    Elegí la ambientación de la sala. Por ahora se aplica solo en tu pantalla.
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {ambiances.map((a) => {
                      const active = p.ambiance === a.id || (!p.ambiance && a.id === null);
                      return (
                        <button key={a.id ?? 'none'} onClick={() => p.onAmbiance(a.id)}
                          className={`relative rounded-2xl overflow-hidden h-20 border-2 transition-all
                            ${active ? 'border-primary scale-[0.98]' : 'border-transparent hover:border-primary/40'}`}>
                          <span className={`absolute inset-0 bg-gradient-to-br ${a.swatch}`} />
                          <span className="absolute inset-0 bg-black/10" />
                          <span className="absolute bottom-1.5 left-2 text-[11px] font-bold text-white drop-shadow">{a.name}</span>
                          {active && <span className="absolute top-1.5 right-1.5 grid place-items-center w-5 h-5 rounded-full bg-white/90 text-primary"><Check className="w-3.5 h-3.5" /></span>}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* ── Reproducción (host) ── */}
              {tab === 'reproduccion' && p.isHost && (
                <>
                  {!p.hasVideo && (
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-[var(--surface-2)] dark:bg-dark-surface2 text-sm text-[var(--text-muted)]">
                      <Info className="w-4 h-4 shrink-0" /> Elegí un video en la cola para controlar la reproducción.
                    </div>
                  )}
                  <button onClick={p.onRestartAll} disabled={!p.hasVideo}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--surface-2)] dark:bg-dark-surface2
                               hover:bg-primary/10 disabled:opacity-40 transition-colors text-left">
                    <span className="grid place-items-center w-9 h-9 rounded-xl bg-primary/15 text-[var(--primary-dark)] dark:text-primary shrink-0">
                      <RotateCcw className="w-5 h-5" />
                    </span>
                    <span>
                      <span className="block font-semibold text-sm">Reiniciar para todos</span>
                      <span className="block text-xs text-[var(--text-muted)]">Vuelve al segundo 0 en toda la sala.</span>
                    </span>
                  </button>

                  <div className={SECTION}>
                    <p className="font-semibold text-sm mb-2.5 flex items-center gap-2">
                      <CornerDownRight className="w-4 h-4 text-[var(--primary-dark)] dark:text-primary" /> Saltar al minuto
                    </p>
                    <div className="flex items-center gap-2">
                      <input inputMode="numeric" placeholder="min" value={mm}
                        onChange={(e) => setMm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="w-16 text-center py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] dark:bg-dark-surface font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                      <span className="font-bold text-[var(--text-muted)]">:</span>
                      <input inputMode="numeric" placeholder="seg" value={ss}
                        onChange={(e) => setSs(e.target.value.replace(/\D/g, '').slice(0, 2))}
                        className="w-16 text-center py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] dark:bg-dark-surface font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                      <button onClick={doSeek} disabled={!p.hasVideo || (!mm && !ss)}
                        className="ml-auto px-4 py-2 rounded-xl bg-primary-dark text-white text-sm font-semibold disabled:opacity-40 hover:brightness-105 active:scale-[0.97] transition-[transform,filter]">
                        Ir
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* ── Permisos (host) ── */}
              {tab === 'permisos' && p.isHost && (
                <PermissionsPanel permissions={p.permissions} onChange={p.onChangePermissions} />
              )}

              {/* ── Gente y moderación (host) ── */}
              {tab === 'gente' && p.isHost && (
                <>
                  {p.participantsSlot}
                  <div className="rounded-2xl border border-dashed border-[var(--border)] p-4">
                    <p className="flex items-center gap-2 font-semibold text-sm mb-2">
                      <Hammer className="w-4 h-4 text-[var(--text-muted)]" /> Moderación
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-marquee/20 text-amber-700 dark:text-marquee">Pronto</span>
                    </p>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      Expulsar, silenciar y bloquear personas, fijar y borrar mensajes, y cerrar la sala
                      llegan en la próxima actualización (necesitan soporte del servidor).
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
