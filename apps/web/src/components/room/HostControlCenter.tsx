// apps/web/src/components/room/HostControlCenter.tsx
// Centro de control de sala — panel premium deslizable (drawer derecho en desktop,
// full-width en móvil). Organiza los controles del anfitrión + personalización.
// No toca la lógica de tiempo real: recibe handlers ya cableados desde Room.tsx.
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Sparkles, SlidersHorizontal, Crown, Users, PlayCircle, ShieldCheck,
  Copy, Check, RotateCcw, CornerDownRight, Lock, Globe, Mail, Info,
  MessageSquare, Smile, VolumeX, Volume2, UserMinus, Trash2,
} from 'lucide-react';
import { ROOM_THEMES, type ThemeDecor } from '../../lib/roomThemes';
import ThemePreview from './ThemePreview';
import { PermissionsPanel } from './index';
import { Avatar } from '../ui';
import type { RoomPermissions, RoomSettings } from '../../hooks/useSocket';

type TabKey = 'resumen' | 'ambiente' | 'reproduccion' | 'permisos' | 'gente';

interface Member { id: string; username: string; avatar?: string | null; isOwner: boolean; }

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
  // Ambiente
  localAmbiance: string | null;
  onLocalAmbiance: (id: string | null) => void;
  roomSettings: RoomSettings;
  onSetSettings: (patch: Partial<RoomSettings>) => void;
  // Gente / moderación
  members: Member[];
  onlineIds: string[];
  mutedIds: string[];
  currentUserId?: string;
  onKick: (uid: string, banMinutes?: number) => void;
  onMute: (uid: string, muted: boolean) => void;
  onTransfer: (uid: string) => void;
  onClearChat: () => void;
  pendingRequests?: number;
  onOpenRequests?: () => void;
}

const PRIVACY: Record<Props['privacy'], { label: string; icon: typeof Lock }> = {
  public:  { label: 'Pública',         icon: Globe },
  private: { label: 'Privada',         icon: Lock },
  invite:  { label: 'Solo invitación', icon: Mail },
};

const SECTION = 'rounded-2xl bg-[var(--surface-2)] dark:bg-dark-surface2 p-4';

// ── Switch propio (sin libs) ──
function Toggle({ on, onChange, label, desc, icon: Icon }:
  { on: boolean; onChange: (v: boolean) => void; label: string; desc: string; icon: typeof Crown }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--surface-2)] dark:bg-dark-surface2">
      <span className="grid place-items-center w-9 h-9 rounded-xl bg-primary/15 text-[var(--primary-dark)] dark:text-primary shrink-0">
        <Icon className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight">{label}</p>
        <p className="text-xs text-[var(--text-muted)]">{desc}</p>
      </div>
      <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-primary' : 'bg-[var(--border)]'}`}>
        <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: on ? 'translateX(20px)' : 'translateX(0)' }} />
      </button>
    </div>
  );
}

export default function HostControlCenter(p: Props) {
  const [tab, setTab] = useState<TabKey>('resumen');
  const [copied, setCopied] = useState(false);
  const [mm, setMm] = useState('');
  const [ss, setSs] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

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

  // Ambiente: el host fija el tema COMPARTIDO; los demás eligen el suyo (local).
  const selectedTheme = p.isHost ? p.roomSettings.theme : p.localAmbiance;
  const pickAmbiance = (id: string | null) => (p.isHost ? p.onSetSettings({ theme: id }) : p.onLocalAmbiance(id));

  const ambiances = [
    { id: null as string | null, name: 'Ninguno', description: 'La sala queda limpia: solo la función.', swatch: 'from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800', decor: null as ThemeDecor | null },
    ...ROOM_THEMES.map((t) => ({ id: t.id, name: t.name, description: t.description, swatch: t.swatch, decor: t.decor })),
  ];
  const selectedInfo = ambiances.find((a) => a.id === (selectedTheme ?? null));

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

              {/* ── Ambiente + interacción ── */}
              {tab === 'ambiente' && (
                <>
                  <div className="flex items-start gap-2 text-xs text-[var(--text-muted)] px-1 mb-1">
                    <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--primary-dark)] dark:text-primary" />
                    {p.isHost ? 'Elegí la ambientación de la sala. Se aplica para todos.' : 'Elegí tu ambientación. Se aplica solo en tu pantalla.'}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {ambiances.map((a) => {
                      const active = selectedTheme === a.id || (!selectedTheme && a.id === null);
                      return (
                        <button key={a.id ?? 'none'} onClick={() => pickAmbiance(a.id)}
                          aria-pressed={active}
                          className={`group relative rounded-2xl overflow-hidden h-24 border-2 transition-all duration-200
                            ${active
                              ? 'border-primary shadow-[0_0_0_3px_rgba(111,177,224,.25),0_10px_26px_rgba(70,76,140,.20)] scale-[0.98]'
                              : 'border-transparent hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-cine-md'}`}>
                          {/* Previsualización VIVA del ambiente */}
                          {a.decor
                            ? <ThemePreview decor={a.decor} swatch={a.swatch} />
                            : <span className={`absolute inset-0 bg-gradient-to-br ${a.swatch}`} />}
                          {/* Scrim inferior para legibilidad del nombre */}
                          <span className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/45 to-transparent" />
                          <span className="absolute bottom-1.5 left-2 text-[11px] font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,.5)]">{a.name}</span>
                          {active && (
                            <span className="absolute top-1.5 right-1.5 grid place-items-center w-5 h-5 rounded-full bg-white/95 text-primary shadow">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Descripción del ambiente elegido (el selector cuenta su historia) */}
                  <p className="text-xs text-[var(--text-muted)] px-1 pt-0.5 leading-relaxed" aria-live="polite">
                    <span className="font-semibold text-[var(--text)]">{selectedInfo?.name ?? 'Ninguno'}</span>
                    {' · '}{selectedInfo?.description}
                  </p>

                  {p.isHost && (
                    <div className="space-y-2.5 pt-1">
                      <p className="text-xs font-semibold text-[var(--text-muted)] px-1">Interacción de la sala</p>
                      <Toggle icon={MessageSquare} label="Chat" desc="Permitir mensajes de todos."
                        on={p.roomSettings.chatEnabled} onChange={(v) => p.onSetSettings({ chatEnabled: v })} />
                      <Toggle icon={Smile} label="Reacciones" desc="Emojis flotantes sobre el video."
                        on={p.roomSettings.reactionsEnabled} onChange={(v) => p.onSetSettings({ reactionsEnabled: v })} />
                    </div>
                  )}
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
                  <div className="space-y-1.5">
                    {p.members.map((m) => {
                      const isMe = m.id === p.currentUserId;
                      const online = p.onlineIds.includes(m.id);
                      const muted = p.mutedIds.includes(m.id);
                      return (
                        <div key={m.id} className="flex items-center gap-2.5 p-2 rounded-2xl bg-[var(--surface-2)] dark:bg-dark-surface2">
                          <Avatar name={m.username} size="sm" src={m.avatar} online={online} />
                          <span className="text-sm font-semibold flex-1 truncate">
                            {m.username}{isMe && <span className="text-[var(--text-muted)] font-normal"> (vos)</span>}
                          </span>
                          {m.isOwner && <Crown className="w-4 h-4 text-marquee shrink-0" aria-label="Dueño" />}
                          {!isMe && !m.isOwner && (
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button onClick={() => p.onMute(m.id, !muted)} title={muted ? 'Reactivar' : 'Silenciar'}
                                className={`p-1.5 rounded-lg transition-colors ${muted ? 'text-amber-600 dark:text-marquee bg-marquee/15' : 'text-[var(--text-muted)] hover:bg-[var(--surface)] dark:hover:bg-dark-surface'}`}>
                                {muted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                              </button>
                              <button onClick={() => p.onTransfer(m.id)} title="Dar control"
                                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--primary-dark)] dark:hover:text-primary hover:bg-[var(--surface)] dark:hover:bg-dark-surface transition-colors">
                                <Crown className="w-4 h-4" />
                              </button>
                              <button onClick={() => p.onKick(m.id, 10)} title="Expulsar (no puede volver por 10 min)"
                                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors">
                                <UserMinus className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-1">
                    {confirmClear ? (
                      <div className="flex items-center gap-2 p-2 rounded-2xl bg-[var(--error)]/10 border border-[var(--error)]/30">
                        <span className="text-xs font-semibold text-[var(--error)] flex-1">¿Borrar todo el chat?</span>
                        <button onClick={() => { p.onClearChat(); setConfirmClear(false); }}
                          className="px-3 py-1.5 rounded-lg bg-[var(--error)] text-white text-xs font-bold">Sí, limpiar</button>
                        <button onClick={() => setConfirmClear(false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-muted)]">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmClear(true)}
                        className="w-full flex items-center gap-2.5 p-3 rounded-2xl text-left text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error)]/8 transition-colors">
                        <Trash2 className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-semibold">Limpiar el chat para todos</span>
                      </button>
                    )}
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
