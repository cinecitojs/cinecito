// apps/web/src/pages/Admin.tsx — Central de administración (rol ADMIN).
// Monitoreo (stats + en vivo), moderación (usuarios, reportes), gestión (salas,
// enlaces). Ruta protegida por rol en App.tsx. Reutiliza endpoints reales.
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Shield, Users, Film, Flag, Heart, Trash2, Ban, ShieldOff, ShieldCheck,
  AlertTriangle, Search, RefreshCw, Activity, Radio, MessageSquare, TrendingUp,
  Link as LinkIcon, ExternalLink, Youtube, UserCheck, VolumeX, Clock,
} from 'lucide-react';
import { adminApi, reportsApi, roomsApi } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { Button, Badge, Modal, Input, Spinner, toast } from '../components/ui';
import AppLayout from '../components/layout/AppLayout';

type Tab = 'resumen' | 'vivo' | 'usuarios' | 'salas' | 'enlaces' | 'reportes';
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' }) : '—');
const fmtTime = (d?: string | null) => (d ? new Date(d).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'resumen',  label: 'Resumen',  icon: TrendingUp },
  { id: 'vivo',     label: 'En vivo',  icon: Radio },
  { id: 'usuarios', label: 'Usuarios', icon: Users },
  { id: 'salas',    label: 'Salas',    icon: Film },
  { id: 'enlaces',  label: 'Enlaces',  icon: LinkIcon },
  { id: 'reportes', label: 'Reportes', icon: Flag },
];

// ── Sparkline (SVG propio, sin libs) ──
function Sparkline({ data, color = '#3E8CCB' }: { data: number[]; color?: string }) {
  const w = 120, h = 32, n = Math.max(2, data.length);
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => `${(i / (n - 1)) * w},${h - (v / max) * (h - 5) - 3}`);
  const area = `0,${h} ${pts.join(' ')} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-8">
      <polygon points={area} fill={color} opacity="0.12" />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PANEL = 'rounded-3xl border border-[var(--border)] bg-surface dark:bg-dark-surface';

export default function Admin() {
  const [tab, setTab] = useState<Tab>('resumen');
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <header className="flex items-center gap-3 mb-6">
          <span className="w-11 h-11 rounded-2xl bg-primary/12 text-[var(--primary-dark)] dark:text-primary grid place-items-center">
            <Shield className="w-5 h-5" />
          </span>
          <div>
            <h1 className="font-display font-bold text-2xl tracking-tight">Central de administración</h1>
            <p className="text-xs text-[var(--text-muted)]">Monitoreo, moderación y gestión de Cinecito</p>
          </div>
        </header>

        <div className="flex gap-1 mb-6 border-b border-[var(--border)] overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors
                  ${tab === t.id ? 'border-primary text-[var(--primary-dark)] dark:text-primary' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'resumen'  && <Overview />}
        {tab === 'vivo'     && <Live />}
        {tab === 'usuarios' && <UsersTab />}
        {tab === 'salas'    && <RoomsTab />}
        {tab === 'enlaces'  && <VideosTab />}
        {tab === 'reportes' && <Reports />}
      </div>
    </AppLayout>
  );
}

// ── Resumen (stats + sparklines + alertas) ───────────────────
function Overview() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-stats'], queryFn: () => adminApi.stats().then((r) => r.data) });
  if (isLoading || !data) return <Spinner />;
  const t = data.totals;
  const cards = [
    { label: 'Usuarios',          value: t.users,       sub: `+${data.last7.users} esta semana`, icon: Users,         c: 'text-[var(--primary-dark)] dark:text-primary', series: data.series.users, color: '#3E8CCB' },
    { label: 'Salas',             value: t.rooms,       sub: `+${data.last7.rooms} esta semana`,  icon: Film,          c: 'text-[#8E72D6]', series: data.series.rooms, color: '#8E72D6' },
    { label: 'Mensajes',          value: t.messages,    sub: `+${data.last7.messages} esta semana`, icon: MessageSquare, c: 'text-[#4FBE94]' },
    { label: 'Invitados',         value: t.guests,      icon: UserCheck, c: 'text-[var(--text-muted)]' },
    { label: 'Supporters',        value: t.supporters,  icon: Heart, c: 'text-[#d6688c]' },
    { label: 'Sancionados',       value: t.suspended,   icon: Ban,   c: 'text-amber-500', alert: t.suspended > 0 },
  ];
  return (
    <div className="space-y-5">
      {t.openReports > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-3xl bg-[var(--error)]/8 border border-[var(--error)]/25">
          <AlertTriangle className="w-5 h-5 text-[var(--error)] shrink-0" />
          <p className="text-sm font-semibold flex-1">{t.openReports} reporte{t.openReports === 1 ? '' : 's'} sin revisar.</p>
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`${PANEL} p-5`}>
              <div className="flex items-center justify-between">
                <Icon className={`w-5 h-5 ${c.c}`} />
                {c.alert && <span className="w-2 h-2 rounded-full bg-amber-500" />}
              </div>
              <p className={`font-display font-bold text-3xl mt-2 ${c.c}`}>{c.value}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{c.label}</p>
              {c.series ? <div className="mt-2"><Sparkline data={c.series} color={c.color} /></div>
                : c.sub ? <p className="text-[11px] text-[var(--text-muted)] mt-2">{c.sub}</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── En vivo (auto-refresh) ───────────────────────────────────
function Live() {
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['admin-live'], queryFn: () => adminApi.live().then((r) => r.data),
    refetchInterval: 6000,
  });
  if (isLoading || !data) return <Spinner />;
  const big = [
    { label: 'Conexiones', value: data.connections, icon: Activity, c: 'text-[var(--primary-dark)] dark:text-primary' },
    { label: 'Usuarios',   value: data.users,       icon: Users,    c: 'text-[#4FBE94]' },
    { label: 'Invitados',  value: data.guests,      icon: UserCheck, c: 'text-[var(--text-muted)]' },
  ];
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <span className="online-dot" /> En vivo · actualiza cada 6 s
        <span className="ml-auto inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtTime(new Date(dataUpdatedAt).toISOString())}</span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {big.map((b) => {
          const Icon = b.icon;
          return (
            <div key={b.label} className={`${PANEL} p-5`}>
              <Icon className={`w-5 h-5 ${b.c}`} />
              <p className={`font-display font-bold text-3xl mt-2 ${b.c}`}>{b.value}</p>
              <p className="text-xs text-[var(--text-muted)]">{b.label}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip icon={VolumeX} label={`${data.moderation.mutedTotal} silenciados`} />
        <Chip icon={Ban} label={`${data.moderation.bannedTotal} expulsados`} />
        <Chip icon={Film} label={`${data.activeRooms.length} salas con gente`} />
      </div>

      <div className={`${PANEL} overflow-hidden`}>
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
          <Radio className="w-4 h-4 text-[var(--primary-dark)] dark:text-primary" />
          <span className="font-display font-bold text-sm">Salas activas</span>
        </div>
        {data.activeRooms.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-10">Nadie conectado en salas ahora mismo.</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {data.activeRooms.map((r: any) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-9 h-9 rounded-xl bg-primary/10 text-[var(--primary-dark)] dark:text-primary grid place-items-center shrink-0"><Film className="w-4 h-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{r.name} <span className="font-mono text-xs text-[var(--text-muted)]">{r.code}</span></p>
                  <p className="text-xs text-[var(--text-muted)]">{r.present} conectado{r.present === 1 ? '' : 's'}</p>
                </div>
                {r.playing && <Badge color="green">reproduciendo</Badge>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface-2)] dark:bg-dark-surface2 text-xs font-semibold text-[var(--text-muted)]">
      <Icon className="w-3.5 h-3.5" /> {label}
    </span>
  );
}

// ── Enlaces pegados (revisión) ───────────────────────────────
function sourceIcon(s: string) {
  if (s === 'youtube') return <Youtube className="w-4 h-4 text-[#c4302b]" />;
  return <LinkIcon className="w-4 h-4 text-[var(--primary-dark)] dark:text-primary" />;
}
function VideosTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState(''); const [q, setQ] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['admin-videos', q], queryFn: () => adminApi.videos(q).then((r) => r.data.videos as any[]) });
  const [busy, setBusy] = useState<string | null>(null);
  const del = async (id: string) => {
    setBusy(id);
    try { await adminApi.deleteVideo(id); qc.invalidateQueries({ queryKey: ['admin-videos'] }); toast('Enlace eliminado', 'success'); }
    catch { toast('No se pudo eliminar', 'error'); } finally { setBusy(null); }
  };
  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); setQ(search); }} className="flex gap-2 mb-4 max-w-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar URL o título…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] dark:bg-dark-surface2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <Button type="submit" size="sm" variant="secondary"><RefreshCw className="w-4 h-4" /></Button>
      </form>
      {isLoading ? <Spinner /> : !data?.length ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-10">Sin enlaces.</p>
      ) : (
        <div className="space-y-2">
          {data.map((v) => (
            <div key={v.id} className={`${PANEL} p-3.5 flex items-center gap-3`}>
              <span className="w-9 h-9 rounded-xl bg-[var(--surface-2)] dark:bg-dark-surface2 grid place-items-center shrink-0">{sourceIcon(v.source)}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{v.title || 'Sin título'}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{v.url}</p>
                <p className="text-[11px] text-[var(--text-muted)]">{v.room?.name || 'sala'} · {v.room?.code || ''} · {fmt(v.createdAt)}</p>
              </div>
              <a href={v.url} target="_blank" rel="noreferrer" title="Abrir"
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--primary-dark)] dark:hover:text-primary hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2 transition-colors shrink-0">
                <ExternalLink className="w-4 h-4" />
              </a>
              <Button size="sm" variant="danger" loading={busy === v.id} onClick={() => del(v.id)} title="Quitar enlace"><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const REASON_LABEL: Record<string, string> = {
  copyright: 'Derechos de autor', spam: 'Spam', harassment: 'Acoso',
  impersonation: 'Suplantación', illegal: 'Contenido ilegal', other: 'Otro',
};

// ── Reportes ─────────────────────────────────────────────────
function Reports() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('open');
  const { data, isLoading } = useQuery({ queryKey: ['admin-reports', status], queryFn: () => reportsApi.list(status).then((r) => r.data.reports as any[]) });
  const resolve = async (id: string, s: 'actioned' | 'dismissed') => {
    try { await reportsApi.resolve(id, s); qc.invalidateQueries({ queryKey: ['admin-reports'] }); qc.invalidateQueries({ queryKey: ['admin-stats'] }); toast('Reporte actualizado', 'success'); }
    catch { toast('No se pudo actualizar', 'error'); }
  };
  return (
    <div>
      <div className="flex gap-2 mb-4">
        {['open', 'reviewing', 'actioned', 'dismissed'].map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${status === s ? 'bg-primary text-white' : 'bg-[var(--surface-2)] dark:bg-dark-surface2 text-[var(--text-muted)]'}`}>{s}</button>
        ))}
      </div>
      {isLoading ? <Spinner /> : !data?.length ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-10">No hay reportes en «{status}».</p>
      ) : (
        <div className="space-y-2">
          {data.map((r) => (
            <div key={r.id} className={`${PANEL} p-4`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge color="red">{REASON_LABEL[r.reason] || r.reason}</Badge>
                    <span className="text-xs text-[var(--text-muted)]">{r.targetType} · {fmt(r.createdAt)}</span>
                  </div>
                  {r.details && <p className="text-sm mt-1.5">{r.details}</p>}
                  {r.context && <p className="text-xs text-[var(--text-muted)] mt-1 break-all">ctx: {r.context}</p>}
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">por {r.reporter?.username || 'anónimo'} · target {r.targetId}</p>
                </div>
                {(r.status === 'open' || r.status === 'reviewing') && (
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="secondary" onClick={() => resolve(r.id, 'dismissed')}>Descartar</Button>
                    <Button size="sm" onClick={() => resolve(r.id, 'actioned')}>Accionado</Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Usuarios ─────────────────────────────────────────────────
function UsersTab() {
  const qc = useQueryClient();
  const myId = useAuthStore((s) => s.user?.id);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['admin-users', q], queryFn: () => adminApi.users(q).then((r) => r.data.users as any[]) });
  const [mod, setMod] = useState<{ id: string; username: string } | null>(null);
  const [reason, setReason] = useState(''); const [days, setDays] = useState('');
  const [del, setDel] = useState<{ id: string; username: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const refetch = () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); qc.invalidateQueries({ queryKey: ['admin-stats'] }); };
  const act = async (fn: () => Promise<any>, ok: string) => {
    setBusy(true);
    try { await fn(); refetch(); toast(ok, 'success'); }
    catch (e: any) { toast(e.response?.data?.error || 'Error', 'error'); }
    finally { setBusy(false); }
  };
  const setStatus = (id: string, status: 'active' | 'suspended' | 'blocked', extra?: any) => act(() => adminApi.setUserStatus(id, { status, ...extra }), 'Estado actualizado');
  const grant = (id: string, tier: any) => { if (tier) act(() => adminApi.grantUser(id, tier), `Tier ${tier} concedido`); };
  const confirmSuspend = async () => { if (!mod) return; await act(() => adminApi.setUserStatus(mod.id, { status: 'suspended', reason: reason || undefined, days: days ? Number(days) : undefined }), 'Usuario suspendido'); setMod(null); setReason(''); setDays(''); };
  const confirmDelete = async () => { if (!del) return; await act(() => adminApi.deleteUser(del.id), 'Usuario eliminado'); setDel(null); };

  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); setQ(search); }} className="flex gap-2 mb-4 max-w-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por usuario o email…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] dark:bg-dark-surface2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <Button type="submit" size="sm" variant="secondary"><RefreshCw className="w-4 h-4" /></Button>
      </form>
      {isLoading ? <Spinner /> : (
        <div className="space-y-2">
          {data?.map((u) => {
            const isAdmin = u.role === 'ADMIN'; const isMe = u.id === myId;
            const locked = isAdmin || isMe;
            return (
              <div key={u.id} className={`${PANEL} p-3.5 flex items-center gap-3 flex-wrap`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm truncate">{u.username}</span>
                    {isAdmin && <Badge color="yellow">ADMIN</Badge>}
                    {u.isGuest && <Badge color="purple">invitado</Badge>}
                    {u.supporterTier && <Badge color="blue">{u.supporterTier}</Badge>}
                    {u.status === 'suspended' && <Badge color="yellow">suspendido</Badge>}
                    {u.status === 'blocked' && <Badge color="red">bloqueado</Badge>}
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">{u.email || 'sin email'} · {u._count?.rooms ?? 0} salas · {fmt(u.createdAt)}</p>
                </div>
                {!locked && (
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    {u.status === 'active' ? (
                      <>
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => setMod({ id: u.id, username: u.username })} title="Suspender"><ShieldOff className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => setStatus(u.id, 'blocked')} title="Bloquear"><Ban className="w-3.5 h-3.5" /></Button>
                      </>
                    ) : (
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => setStatus(u.id, 'active')} title="Reactivar"><ShieldCheck className="w-3.5 h-3.5" /></Button>
                    )}
                    <select disabled={busy} defaultValue="" onChange={(e) => { grant(u.id, e.target.value); e.target.value = ''; }}
                      className="h-8 rounded-lg border border-[var(--border)] bg-[var(--bg)] dark:bg-dark-surface2 text-xs px-1.5">
                      <option value="">Dar tier…</option>
                      <option value="amigo">Amigo</option>
                      <option value="colaborador">Colaborador</option>
                      <option value="patrocinador">Patrocinador</option>
                    </select>
                    <Button size="sm" variant="danger" disabled={busy} onClick={() => setDel({ id: u.id, username: u.username })} title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!mod} onClose={() => setMod(null)} title={`Suspender a ${mod?.username || ''}`} size="sm">
        <div className="space-y-3">
          <Input label="Motivo (opcional)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: spam reiterado" />
          <Input label="Días (vacío = indefinido)" type="number" value={days} onChange={(e) => setDays(e.target.value)} placeholder="7" />
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setMod(null)} className="flex-1">Cancelar</Button>
            <Button variant="danger" loading={busy} onClick={confirmSuspend} className="flex-1">Suspender</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!del} onClose={() => setDel(null)} title="Eliminar usuario" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-muted)] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-[var(--error)] mt-0.5 shrink-0" />
            Vas a eliminar a <b className="text-[var(--text)]">{del?.username}</b> y sus salas. Es permanente.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setDel(null)} className="flex-1">Cancelar</Button>
            <Button variant="danger" loading={busy} onClick={confirmDelete} className="flex-1"><Trash2 className="w-4 h-4" /> Eliminar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Salas ────────────────────────────────────────────────────
function RoomsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState(''); const [q, setQ] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['admin-rooms', q], queryFn: () => adminApi.rooms(q).then((r) => r.data.rooms as any[]) });
  const [del, setDel] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const confirmDelete = async () => {
    if (!del) return; setBusy(true);
    try { await roomsApi.delete(del.id); qc.invalidateQueries({ queryKey: ['admin-rooms'] }); qc.invalidateQueries({ queryKey: ['admin-stats'] }); toast('Sala eliminada', 'success'); setDel(null); }
    catch (e: any) { toast(e.response?.data?.error || 'No se pudo eliminar', 'error'); }
    finally { setBusy(false); }
  };
  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); setQ(search); }} className="flex gap-2 mb-4 max-w-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar sala…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] dark:bg-dark-surface2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <Button type="submit" size="sm" variant="secondary"><RefreshCw className="w-4 h-4" /></Button>
      </form>
      {isLoading ? <Spinner /> : !data?.length ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-10">Sin salas.</p>
      ) : (
        <div className="space-y-2">
          {data.map((r) => (
            <div key={r.id} className={`${PANEL} p-3.5 flex items-center gap-3`}>
              <span className="w-9 h-9 rounded-xl bg-primary/10 text-[var(--primary-dark)] dark:text-primary grid place-items-center shrink-0"><Film className="w-4 h-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm truncate">{r.name}</span>
                  <span className="font-mono text-xs text-[var(--text-muted)]">{r.code}</span>
                  {r.inviteOnly ? <Badge color="purple">invitación</Badge> : r.isPrivate ? <Badge color="purple">privada</Badge> : <Badge color="green">pública</Badge>}
                  {r.currentVideoId && <Badge color="blue">en vivo</Badge>}
                </div>
                <p className="text-xs text-[var(--text-muted)]">{r.owner?.username || 'sin dueño'} · {r._count?.members ?? 0} miembros · {fmt(r.updatedAt)}</p>
              </div>
              <Button size="sm" variant="danger" onClick={() => setDel({ id: r.id, name: r.name })} title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!del} onClose={() => setDel(null)} title="Eliminar sala" size="sm">
        <p className="text-sm text-[var(--text-muted)] mb-4">¿Eliminar <b className="text-[var(--text)]">{del?.name}</b>? Es permanente.</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setDel(null)} className="flex-1">Cancelar</Button>
          <Button variant="danger" loading={busy} onClick={confirmDelete} className="flex-1"><Trash2 className="w-4 h-4" /> Eliminar</Button>
        </div>
      </Modal>
    </div>
  );
}
