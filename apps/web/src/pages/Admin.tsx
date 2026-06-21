// apps/web/src/pages/Admin.tsx — Panel de administración (rol ADMIN).
// Métricas + moderación de usuarios + revisión de reportes + gestión de salas.
// Reutiliza endpoints existentes. La ruta está protegida por rol en App.tsx.
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Shield, Users, Film, Flag, Heart, Trash2, Ban, ShieldOff, ShieldCheck,
  AlertTriangle, Search, RefreshCw,
} from 'lucide-react';
import { adminApi, reportsApi, roomsApi } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { Button, Badge, Modal, Input, Spinner, toast } from '../components/ui';
import AppLayout from '../components/layout/AppLayout';

type Tab = 'resumen' | 'reportes' | 'usuarios' | 'salas';
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' }) : '—');

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'resumen',  label: 'Resumen',  icon: Shield },
  { id: 'reportes', label: 'Reportes', icon: Flag },
  { id: 'usuarios', label: 'Usuarios', icon: Users },
  { id: 'salas',    label: 'Salas',    icon: Film },
];

export default function Admin() {
  const [tab, setTab] = useState<Tab>('resumen');
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><Shield className="w-5 h-5" /></span>
          <div>
            <h1 className="font-display font-bold text-2xl">Administración</h1>
            <p className="text-xs text-[var(--text-muted)]">Moderación y gestión de Cinecito</p>
          </div>
        </div>

        <div className="flex gap-1 mb-6 border-b border-[var(--border)] overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors
                  ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'resumen'  && <Overview />}
        {tab === 'reportes' && <Reports />}
        {tab === 'usuarios' && <UsersTab />}
        {tab === 'salas'    && <RoomsTab />}
      </div>
    </AppLayout>
  );
}

// ── Resumen ──────────────────────────────────────────────────
function Overview() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-overview'], queryFn: () => adminApi.overview().then((r) => r.data) });
  if (isLoading) return <Spinner />;
  const cards = [
    { label: 'Usuarios',        value: data.users,       icon: Users, c: 'text-primary' },
    { label: 'Invitados',       value: data.guests,      icon: Users, c: 'text-[var(--text-muted)]' },
    { label: 'Salas',           value: data.rooms,       icon: Film,  c: 'text-pink-500' },
    { label: 'Reportes abiertos', value: data.openReports, icon: Flag,  c: 'text-red-500' },
    { label: 'Supporters',      value: data.supporters,  icon: Heart, c: 'text-accent-fg dark:text-accent' },
    { label: 'Sancionados',     value: data.suspended,   icon: Ban,   c: 'text-orange-500' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="rounded-3xl border border-[var(--border)] bg-surface dark:bg-dark-surface p-5">
            <Icon className={`w-5 h-5 ${c.c} mb-2`} />
            <p className={`font-display font-bold text-2xl ${c.c}`}>{c.value}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{c.label}</p>
          </div>
        );
      })}
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
    try { await reportsApi.resolve(id, s); qc.invalidateQueries({ queryKey: ['admin-reports'] }); qc.invalidateQueries({ queryKey: ['admin-overview'] }); toast('Reporte actualizado', 'success'); }
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
            <div key={r.id} className="rounded-2xl border border-[var(--border)] bg-surface dark:bg-dark-surface p-4">
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

  const refetch = () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); qc.invalidateQueries({ queryKey: ['admin-overview'] }); };
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
              <div key={u.id} className="rounded-2xl border border-[var(--border)] bg-surface dark:bg-dark-surface p-3.5 flex items-center gap-3 flex-wrap">
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
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
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
    try { await roomsApi.delete(del.id); qc.invalidateQueries({ queryKey: ['admin-rooms'] }); qc.invalidateQueries({ queryKey: ['admin-overview'] }); toast('Sala eliminada', 'success'); setDel(null); }
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
            <div key={r.id} className="rounded-2xl border border-[var(--border)] bg-surface dark:bg-dark-surface p-3.5 flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Film className="w-4 h-4" /></span>
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
