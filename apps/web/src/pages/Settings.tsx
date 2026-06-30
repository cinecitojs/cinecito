// apps/web/src/pages/Settings.tsx — Centro de configuración de cuenta.
// Unifica PERFIL (avatar, identidad, stats, actividad) + ajustes reales agrupados:
// Perfil · Apariencia · Audio y video · Accesibilidad · Notificaciones · Privacidad · Cuenta.
// (Antes había /profile y /configuracion editando lo mismo → ahora un solo lugar.)
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  User, Mail, Lock, LogOut, Palette, Moon, Sun, Volume2, Accessibility, Bell, ShieldCheck,
  Check, X, Pencil, RefreshCw, Camera, Film, Play, Users, ChevronRight, Sparkles,
  Scale, FileText, ExternalLink, Cookie, Trash2, AlertTriangle, Heart,
} from 'lucide-react';
import { authApi, roomsApi, legalApi } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useSettings } from '../store/useSettings';
import { useCookieConsent } from '../store/useCookieConsent';
import { Button, Input, Switch, Badge, Modal, toast } from '../components/ui';
import AppLayout from '../components/layout/AppLayout';
import SupporterPanel from '../components/SupporterPanel';
import { SupporterBadge, SupporterFrame } from '../components/SupporterBadge';
import { useSupporter } from '../hooks/useSupporter';
import { rewardOf, displayTierOf } from '../lib/supporterRewards';
import { ThemeContext } from '../app/App';

// Portada por nivel de supporter (cosmético). null = portada genérica.
const SUPPORTER_COVER: Record<string, string> = {
  amigo: 'from-pink-400/40 via-rose-300/25 to-amber-200/25',
  colaborador: 'from-sky-400/40 via-primary/25 to-indigo-300/25',
  patrocinador: 'from-amber-400/40 via-fuchsia-400/30 to-violet-500/30',
};

const CATEGORIES = [
  { id: 'perfil',         label: 'Perfil',         icon: User },
  { id: 'apariencia',     label: 'Apariencia',     icon: Palette },
  { id: 'dispositivos',   label: 'Audio y video',  icon: Volume2 },
  { id: 'accesibilidad',  label: 'Accesibilidad',  icon: Accessibility },
  { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
  { id: 'apoyo',          label: 'Apoyo',          icon: Heart },
  { id: 'privacidad',     label: 'Privacidad',     icon: ShieldCheck },
  { id: 'legal',          label: 'Legal',          icon: Scale },
  { id: 'cuenta',         label: 'Cuenta',         icon: LogOut },
];

// Documentos del Centro Legal (enlazan a las páginas /legal/*).
const LEGAL_LINKS = [
  { slug: 'terminos',    label: 'Términos y Condiciones' },
  { slug: 'privacidad',  label: 'Política de Privacidad' },
  { slug: 'cookies',     label: 'Política de Cookies' },
  { slug: 'copyright',   label: 'Copyright y Contenido Prohibido' },
  { slug: 'aviso-legal', label: 'Aviso Legal' },
  { slug: 'contacto',    label: 'Contacto' },
];

const CONSENT_LABELS: Record<string, string> = {
  terms: 'Términos y Condiciones',
  privacy: 'Política de Privacidad',
  cookies: 'Cookies',
  marketing: 'Comunicaciones (marketing)',
};

const AVATAR_PRESETS = [
  { src: '/pocine-hello.png?v=20260622',       label: 'Pociné' },
  { src: '/pocine-celebrate.png?v=20260622',  label: 'Pociné guiño' },
  { src: '/pocine-empty.png?v=20260622', label: 'Pociné dormido' },
];

interface Room {
  id: string; name: string; code: string; ownerId: string;
  currentVideoId?: string | null; updatedAt: string; _count?: { members?: number };
}
const formatDate = (d: string) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });

function Section({ id, icon: Icon, title, children }: { id: string; icon: any; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 bg-surface dark:bg-dark-surface rounded-3xl border border-[var(--border)] p-5 sm:p-6">
      <h2 className="font-display font-bold text-lg flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-primary" /> {title}
      </h2>
      {children}
    </section>
  );
}
function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[var(--border)] last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        {hint && <p className="text-xs text-[var(--text-muted)] mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const selectCls = 'h-9 max-w-[12rem] sm:max-w-[14rem] px-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] dark:bg-dark-surface2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';

export default function Settings() {
  const navigate = useNavigate();
  const { user, setUser, clearAuth } = useAuthStore();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const settings = useSettings();
  const reopenCookies = useCookieConsent((s) => s.reopen);
  const { data: supporter } = useSupporter();
  const supTier = supporter?.tier ?? null;                       // nivel alcanzado
  const supDisplay = displayTierOf(supporter) ?? supTier;        // estilo elegido a mostrar

  // ── Eliminar cuenta ──
  const [showDelete, setShowDelete]     = useState(false);
  const [deletePass, setDeletePass]     = useState('');
  const [deleting, setDeleting]         = useState(false);
  const [deleteError, setDeleteError]   = useState('');

  // ── Perfil: nombre + avatar + stats + actividad ──
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft]     = useState(user?.username || '');
  const [savingName, setSavingName]   = useState(false);
  const [showAvatar, setShowAvatar]   = useState(false);
  const [avatarDraft, setAvatarDraft] = useState(user?.avatar || '');
  const [savingAvatar, setSavingAvatar] = useState(false);

  const { data: rooms = [] } = useQuery({
    queryKey: ['my-rooms'],
    queryFn: () => roomsApi.myRooms().then((r) => r.data.rooms as Room[]),
    enabled: !user?.guest,
  });

  // Consentimientos registrados (evidencia): estado actual por tipo.
  const { data: consents } = useQuery({
    queryKey: ['my-consents'],
    queryFn: () => legalApi.consents().then((r) => r.data as {
      current: Record<string, { accepted: boolean; version: string; at: string }>;
      versions: Record<string, string>;
    }),
    enabled: !user?.guest,
  });
  const stats = useMemo(() => ({
    total: rooms.length,
    creadas: rooms.filter((r) => r.ownerId === user?.id).length,
    enVivo: rooms.filter((r) => r.currentVideoId).length,
    espectadores: rooms.reduce((s, r) => s + (r._count?.members || 0), 0),
  }), [rooms, user?.id]);
  const recent = useMemo(
    () => [...rooms].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 4),
    [rooms],
  );
  const initial = (user?.username || '?').charAt(0).toUpperCase();

  const saveName = async () => {
    const v = nameDraft.trim();
    if (!v || v === user?.username) { setEditingName(false); return; }
    setSavingName(true);
    try {
      const { data } = await authApi.updateProfile({ username: v });
      setUser(data.user); toast('Nombre actualizado', 'success'); setEditingName(false);
    } catch (err: any) { toast(err.response?.data?.error || 'No se pudo guardar', 'error'); }
    finally { setSavingName(false); }
  };
  const saveAvatar = async () => {
    setSavingAvatar(true);
    try {
      const { data } = await authApi.updateProfile({ avatar: avatarDraft });
      setUser(data.user); toast('Avatar actualizado 🎬', 'success'); setShowAvatar(false);
    } catch (err: any) { toast(err.response?.data?.error || 'No se pudo actualizar', 'error'); }
    finally { setSavingAvatar(false); }
  };

  // ── Audio y video — dispositivos ──
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [devLoaded, setDevLoaded] = useState(false);
  const [devError, setDevError]   = useState('');
  const [detecting, setDetecting] = useState(false);
  const detectDevices = async () => {
    if (typeof window !== 'undefined' && !window.isSecureContext) { setDevError('Los dispositivos requieren HTTPS (en el celular).'); return; }
    if (!navigator.mediaDevices?.enumerateDevices) { setDevError('Este navegador no permite listar dispositivos acá.'); return; }
    setDetecting(true); setDevError('');
    try {
      const tmp = await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).catch(() => null);
      const list = await navigator.mediaDevices.enumerateDevices();
      tmp?.getTracks().forEach((t) => { try { t.stop(); } catch { /* */ } });
      setMics(list.filter((d) => d.kind === 'audioinput'));
      setCams(list.filter((d) => d.kind === 'videoinput'));
      setDevLoaded(true);
    } catch { setDevError('No se pudieron detectar los dispositivos.'); }
    finally { setDetecting(false); }
  };

  // ── Notificaciones ──
  const supportsNotif = typeof Notification !== 'undefined';
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(supportsNotif ? Notification.permission : 'unsupported');
  const toggleNotify = async (on: boolean) => {
    if (!on) { settings.update({ notifyMessages: false }); return; }
    if (!supportsNotif) { toast('Tu navegador no soporta notificaciones', 'error'); return; }
    let p = Notification.permission;
    if (p === 'default') p = await Notification.requestPermission();
    setPerm(p);
    if (p !== 'granted') { toast('Permiso de notificaciones denegado', 'error'); settings.update({ notifyMessages: false }); return; }
    settings.update({ notifyMessages: true });
    toast('Notificaciones activadas 🔔', 'success');
  };

  const logout = () => { clearAuth(); navigate('/login'); toast('Sesión cerrada', 'info'); };

  const handleDelete = async () => {
    setDeleting(true); setDeleteError('');
    try {
      // Los invitados no tienen contraseña; los registrados deben reingresarla.
      await authApi.deleteAccount(user?.guest ? undefined : deletePass);
      clearAuth();
      toast('Tu cuenta fue eliminada', 'info');
      navigate('/');
    } catch (err: any) {
      setDeleteError(err.response?.data?.error || 'No se pudo eliminar la cuenta');
      setDeleting(false);
    }
  };

  const fmtConsent = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
  useEffect(() => { setNameDraft(user?.username || ''); }, [user?.username]);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-display font-bold text-2xl sm:text-3xl mb-6">Configuración</h1>

        <div className="grid lg:grid-cols-[180px_1fr] gap-6">
          {/* Sidebar de categorías (desktop) */}
          <nav className="hidden lg:flex flex-col gap-1 sticky top-20 self-start" aria-label="Categorías de configuración">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              return (
                <a key={c.id} href={`#${c.id}`}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2 transition-colors">
                  <Icon className="w-4 h-4" /> {c.label}
                </a>
              );
            })}
          </nav>

          {/* Contenido */}
          <div className="flex flex-col gap-5 min-w-0">
            {/* ── Perfil ── */}
            <section id="perfil" className="scroll-mt-20 flex flex-col gap-5">
              {/* Identidad */}
              <div className="bg-surface dark:bg-dark-surface rounded-3xl border border-[var(--border)] overflow-hidden">
                <div className={`relative h-24 bg-cover bg-center bg-gradient-to-r ${supDisplay ? SUPPORTER_COVER[supDisplay] : 'from-primary/25 via-accent/20 to-secondary/25'}`}
                  style={supDisplay ? { backgroundImage: `url(${rewardOf(supDisplay)?.assets.bg})` } : undefined} />
                <div className="px-6 pb-6 -mt-12">
                  <div className="flex items-end justify-between">
                    <button onClick={() => { setAvatarDraft(user?.avatar || ''); setShowAvatar(true); }}
                      className="relative group rounded-full" aria-label="Cambiar avatar">
                      {supTier ? (
                        <SupporterFrame tier={supDisplay} name={user?.username} src={user?.avatar} size={52} className="w-auto" />
                      ) : (
                        <span className="block w-24 h-24 rounded-full overflow-hidden ring-4 ring-surface dark:ring-dark-surface bg-primary/15 flex items-center justify-center">
                          {user?.avatar
                            ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                            : <span className="w-full h-full flex items-center justify-center text-3xl font-display font-bold text-primary">{initial}</span>}
                        </span>
                      )}
                      <span className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center ring-2 ring-surface dark:ring-dark-surface group-hover:bg-primary-dark transition-colors">
                        <Camera className="w-4 h-4" />
                      </span>
                    </button>
                    {!editingName && (
                      <Button variant="secondary" size="sm" onClick={() => { setNameDraft(user?.username || ''); setEditingName(true); }}>
                        <Pencil className="w-3.5 h-3.5" /> Editar nombre
                      </Button>
                    )}
                  </div>
                  <div className="mt-3">
                    {editingName ? (
                      <div className="flex items-center gap-2 max-w-xs">
                        <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} autoFocus aria-label="Nombre de usuario" />
                        <Button size="sm" loading={savingName} onClick={saveName} aria-label="Guardar"><Check className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingName(false)} aria-label="Cancelar"><X className="w-4 h-4" /></Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-display font-bold text-xl">{user?.username}</h2>
                        {user?.guest ? <Badge color="purple">Invitado</Badge> : <Badge color="blue">Miembro</Badge>}
                        {supTier && <SupporterBadge tier={supDisplay} size="sm" />}
                      </div>
                    )}
                    {user?.email ? (
                      <p className="text-sm text-[var(--text-muted)] mt-1 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> {user.email}
                        <Lock className="w-3 h-3 opacity-60" aria-label="El email no se puede cambiar" />
                      </p>
                    ) : (
                      <p className="text-sm text-[var(--text-muted)] mt-1">Sin email asociado</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Invitado → crear cuenta */}
              {user?.guest && (
                <div className="rounded-3xl border-2 border-dashed border-primary/40 bg-primary/5 p-5 flex items-center gap-4">
                  <Sparkles className="w-6 h-6 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold">Estás como invitado</p>
                    <p className="text-sm text-[var(--text-muted)]">Creá una cuenta para guardar tus salas y volver cuando quieras.</p>
                  </div>
                  <Link to="/register"><Button size="sm">Crear cuenta</Button></Link>
                </div>
              )}

              {/* Estadísticas */}
              {!user?.guest && (
                <div className="bg-surface dark:bg-dark-surface rounded-3xl border border-[var(--border)] p-5 sm:p-6">
                  <h3 className="font-display font-semibold text-sm text-[var(--text-muted)] mb-3">Estadísticas</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { v: stats.total,        l: 'Tus salas',       c: 'text-primary' },
                      { v: stats.creadas,      l: 'Creadas por vos', c: 'text-pink-500' },
                      { v: stats.enVivo,       l: 'En vivo ahora',   c: 'text-[var(--success)]' },
                      { v: stats.espectadores, l: 'Espectadores',    c: 'text-purple-500' },
                    ].map((s) => (
                      <div key={s.l} className="bg-[var(--surface-2)] dark:bg-dark-surface2 rounded-2xl p-4">
                        <p className={`font-display font-bold text-2xl ${s.c}`}>{s.v}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{s.l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actividad reciente */}
              {!user?.guest && recent.length > 0 && (
                <div className="bg-surface dark:bg-dark-surface rounded-3xl border border-[var(--border)] p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-semibold text-sm text-[var(--text-muted)]">Actividad reciente</h3>
                    <Link to="/home" className="text-xs text-primary font-semibold hover:underline">Ver todas</Link>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden">
                    {recent.map((room) => (
                      <button key={room.id} onClick={() => navigate(`/room/${room.id}`)}
                        className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2 transition-colors">
                        <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Film className="w-4 h-4" /></span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{room.name}</p>
                          <p className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                            {room.currentVideoId
                              ? <span className="flex items-center gap-1 text-[var(--success)]"><Play className="w-3 h-3" /> En vivo</span>
                              : <span>Actualizada {formatDate(room.updatedAt)}</span>}
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {room._count?.members || 0}</span>
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* ── Apariencia ── */}
            <Section id="apariencia" icon={Palette} title="Apariencia">
              <Row label="Tema oscuro" hint="Sala de proyección / claro">
                <span className="flex items-center gap-2.5">
                  {theme === 'dark' ? <Moon className="w-4 h-4 text-accent" /> : <Sun className="w-4 h-4 text-marquee" />}
                  <Switch checked={theme === 'dark'} onChange={toggleTheme} label="Cambiar tema" />
                </span>
              </Row>
            </Section>

            {/* ── Audio y video ── */}
            <Section id="dispositivos" icon={Volume2} title="Audio y video">
              {!devLoaded ? (
                <div className="flex flex-col items-start gap-2 py-2">
                  <p className="text-sm text-[var(--text-muted)]">Detectá tu micrófono y cámara para elegir cuáles usar en las llamadas.</p>
                  <Button size="sm" variant="secondary" loading={detecting} onClick={detectDevices}>
                    <RefreshCw className="w-4 h-4" /> Detectar dispositivos
                  </Button>
                  {devError && <p className="text-xs text-red-500">{devError}</p>}
                </div>
              ) : (
                <>
                  <Row label="Micrófono">
                    <select className={selectCls} value={settings.micDeviceId}
                      onChange={(e) => settings.update({ micDeviceId: e.target.value })} aria-label="Micrófono">
                      <option value="">Predeterminado del sistema</option>
                      {mics.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Micrófono ${i + 1}`}</option>)}
                    </select>
                  </Row>
                  <Row label="Cámara">
                    <select className={selectCls} value={settings.camDeviceId}
                      onChange={(e) => settings.update({ camDeviceId: e.target.value })} aria-label="Cámara">
                      <option value="">Predeterminada del sistema</option>
                      {cams.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Cámara ${i + 1}`}</option>)}
                    </select>
                  </Row>
                  <p className="text-xs text-[var(--text-muted)] pt-3">Se usan al unirte a una llamada. <button onClick={detectDevices} className="text-primary hover:underline">Volver a detectar</button></p>
                </>
              )}
            </Section>

            {/* ── Accesibilidad ── */}
            <Section id="accesibilidad" icon={Accessibility} title="Accesibilidad">
              <Row label="Reducir movimiento" hint="Desactiva animaciones y transiciones">
                <Switch checked={settings.reduceMotion} onChange={(v) => settings.update({ reduceMotion: v })} label="Reducir movimiento" />
              </Row>
            </Section>

            {/* ── Notificaciones ── */}
            <Section id="notificaciones" icon={Bell} title="Notificaciones">
              <Row label="Avisarme de mensajes nuevos" hint={
                perm === 'unsupported' ? 'No soportado en este navegador'
                : perm === 'denied' ? 'Bloqueado — habilitalo en el navegador'
                : 'Cuando la pestaña está en segundo plano'}>
                <Switch
                  checked={settings.notifyMessages && perm === 'granted'}
                  disabled={perm === 'unsupported' || perm === 'denied'}
                  onChange={toggleNotify} label="Notificaciones de mensajes" />
              </Row>
            </Section>

            {/* ── Apoyo y recompensas ── */}
            <Section id="apoyo" icon={Heart} title="Apoyo y recompensas">
              <SupporterPanel />
            </Section>

            {/* ── Privacidad (nota honesta) ── */}
            <Section id="privacidad" icon={ShieldCheck} title="Privacidad">
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                La privacidad se maneja <span className="font-semibold text-[var(--text)]">por sala</span> (privada o solo por
                invitación). No hay (todavía) ajustes de privacidad a nivel de cuenta.
              </p>
            </Section>

            {/* ── Legal ── */}
            <Section id="legal" icon={Scale} title="Legal">
              {/* Documentos */}
              <div className="rounded-2xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden">
                {LEGAL_LINKS.map((l) => (
                  <Link key={l.slug} to={`/legal/${l.slug}`}
                    className="flex items-center gap-3 p-3.5 hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2 transition-colors">
                    <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><FileText className="w-4 h-4" /></span>
                    <span className="flex-1 text-sm font-semibold">{l.label}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  </Link>
                ))}
              </div>

              {/* Gestión de consentimiento */}
              <div className="mt-5">
                <h3 className="font-display font-semibold text-sm mb-1">Gestión de consentimiento</h3>
                <p className="text-xs text-[var(--text-muted)] mb-3">Lo que aceptaste y cuándo.</p>

                {user?.guest ? (
                  <p className="text-sm text-[var(--text-muted)]">Como invitado no hay consentimientos registrados. <Link to="/register" className="text-primary hover:underline">Creá una cuenta</Link>.</p>
                ) : consents && Object.keys(consents.current).length > 0 ? (
                  <div className="rounded-2xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden">
                    {Object.entries(consents.current).map(([type, info]) => (
                      <div key={type} className="flex items-center justify-between gap-3 p-3.5">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{CONSENT_LABELS[type] || type}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            v{info.version} · {fmtConsent(info.at)}
                          </p>
                        </div>
                        <Badge color={info.accepted ? 'blue' : 'purple'}>{info.accepted ? 'Aceptado' : 'Rechazado'}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">Aún no hay consentimientos registrados.</p>
                )}

                <div className="mt-3">
                  <Button variant="secondary" size="sm" onClick={() => { reopenCookies(); toast('Configurá tus cookies abajo', 'info'); }}>
                    <Cookie className="w-4 h-4" /> Cambiar preferencias de cookies
                  </Button>
                </div>
              </div>
            </Section>

            {/* ── Cuenta ── */}
            <Section id="cuenta" icon={LogOut} title="Cuenta">
              <Row label="Sesión" hint="Cerrar sesión en este dispositivo">
                <Button variant="danger" size="sm" onClick={logout}><LogOut className="w-4 h-4" /> Cerrar sesión</Button>
              </Row>
              <Row label="Eliminar cuenta" hint="Borra tu cuenta y tus salas de forma permanente">
                <Button variant="danger" size="sm" onClick={() => { setDeletePass(''); setDeleteError(''); setShowDelete(true); }}>
                  <Trash2 className="w-4 h-4" /> Eliminar
                </Button>
              </Row>
            </Section>
          </div>
        </div>
      </div>

      {/* ── Modal: cambiar avatar ── */}
      <Modal open={showAvatar} onClose={() => setShowAvatar(false)} title="Cambiar avatar">
        <div className="space-y-5">
          <div className="flex justify-center">
            <span className="w-24 h-24 rounded-full overflow-hidden bg-primary/15 flex items-center justify-center ring-2 ring-[var(--border)]">
              {avatarDraft
                ? <img src={avatarDraft} alt="" className="w-full h-full object-cover" />
                : <span className="text-3xl font-display font-bold text-primary">{initial}</span>}
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">Elegí a Pociné</p>
            <div className="grid grid-cols-3 gap-3">
              {AVATAR_PRESETS.map((p) => (
                <button key={p.src} onClick={() => setAvatarDraft(p.src)}
                  className={`rounded-2xl border-2 p-2 transition-all ${avatarDraft === p.src ? 'border-primary bg-primary/10' : 'border-[var(--border)] hover:border-primary/40'}`}>
                  <img src={p.src} alt={p.label} className="w-full h-16 object-contain" />
                </button>
              ))}
            </div>
          </div>
          <Input label="O pegá una URL de imagen" placeholder="https://…"
            value={avatarDraft.startsWith('/') ? '' : avatarDraft}
            onChange={(e) => setAvatarDraft(e.target.value)} />
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setShowAvatar(false)} className="flex-1">Cancelar</Button>
            <Button onClick={saveAvatar} loading={savingAvatar} className="flex-1">Guardar avatar</Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: eliminar cuenta ── */}
      <Modal open={showDelete} onClose={() => !deleting && setShowDelete(false)} title="Eliminar cuenta" size="sm">
        <div className="space-y-4">
          <div className="flex justify-center">
            <span className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </span>
          </div>
          <div className="text-sm text-[var(--text-muted)] leading-relaxed space-y-2">
            <p className="text-center font-semibold text-[var(--text)]">Esta acción es permanente e irreversible.</p>
            <p>Al eliminar tu cuenta:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Se borran tu perfil y tus datos de cuenta.</li>
              <li>Se eliminan <strong>las salas que creaste</strong> y su contenido.</li>
              <li>Perderás el acceso de inmediato. No se puede deshacer.</li>
            </ul>
          </div>

          {!user?.guest && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="del-pass" className="text-xs font-semibold">Confirmá con tu contraseña</label>
              <Input id="del-pass" type="password" value={deletePass}
                onChange={(e) => setDeletePass(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
            </div>
          )}

          {deleteError && (
            <p role="alert" className="text-xs text-red-500">{deleteError}</p>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setShowDelete(false)} disabled={deleting} className="flex-1">Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}
              disabled={!user?.guest && !deletePass} className="flex-1">
              <Trash2 className="w-4 h-4" /> Eliminar mi cuenta
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
