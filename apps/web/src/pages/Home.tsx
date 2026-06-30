// apps/web/src/pages/Home.tsx — Dashboard (centro de uso real)
// Restructuración visual a panel/cards compactos: el usuario hace todo sin
// scroll largo. TODA la lógica de salas (query/create/join/delete/copy) se
// conserva intacta. Estética celeste/crema kawaii premium (cielo-root).
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Key, Users, Trash2, ArrowRight, Copy, Check, Play, Youtube,
  ShieldCheck, Compass, Sparkles, Clapperboard, Heart, ChevronRight,
} from 'lucide-react';
import { roomsApi } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { Button, Input, Modal, Avatar, Skeleton, EmptyState, toast } from '../components/ui';
import AppLayout from '../components/layout/AppLayout';

const ROOM_MODES = [
  { key: 'public'  as const, label: 'Pública',         desc: 'Aparece en Explorar. Cualquiera puede entrar.' },
  { key: 'private' as const, label: 'Privada',         desc: 'Se entra con el link de invitación.' },
  { key: 'invite'  as const, label: 'Solo invitación', desc: 'Cada ingreso lo aprobás vos.' },
];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

interface Room {
  id: string; name: string; description?: string | null; code: string;
  isPrivate: boolean; currentVideoId?: string | null; ownerId: string;
  updatedAt: string; _count?: { members?: number };
}

export default function Home() {
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const { user } = useAuthStore();

  const [joinCode, setJoinCode]   = useState('');
  const [joining, setJoining]     = useState(false);
  const [joinError, setJoinError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [newRoom, setNewRoom]       = useState<{ name: string; description: string; mode: 'public' | 'private' | 'invite' }>({ name: '', description: '', mode: 'private' });
  const [creating, setCreating]     = useState(false);

  const [copiedId, setCopiedId]         = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting]         = useState(false);

  const { data: rawRooms = [], isLoading } = useQuery({
    queryKey: ['my-rooms'],
    queryFn:  () => roomsApi.myRooms().then((r) => r.data.rooms as Room[]),
  });

  const rooms = useMemo(
    () => [...rawRooms].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [rawRooms],
  );
  const playing = useMemo(() => rooms.filter((r) => r.currentVideoId), [rooms]);

  // ── Unirse: acepta código de sala o link de invitación ──
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = joinCode.trim();
    if (!raw) return;
    const inviteMatch = raw.match(/invite\/([A-Za-z0-9]+)/);
    if (inviteMatch) { navigate(`/invite/${inviteMatch[1]}`); return; }
    const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (!code) { setJoinError('Ingresá un código o link válido'); return; }
    setJoining(true); setJoinError('');
    try {
      const { data } = await roomsApi.join({ code });
      navigate(`/room/${data.room.id}`);
    } catch (err: any) {
      setJoinError(err.response?.data?.error || 'Código inválido');
    } finally { setJoining(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.name.trim()) return;
    setCreating(true);
    try {
      const { data } = await roomsApi.create({ name: newRoom.name, description: newRoom.description, mode: newRoom.mode });
      toast(`Tu sala "${data.name}" está lista`, 'success');
      qc.invalidateQueries({ queryKey: ['my-rooms'] });
      setShowCreate(false);
      setNewRoom({ name: '', description: '', mode: 'private' });
      navigate(`/room/${data.id}`);
    } catch { toast('No se pudo crear la sala', 'error'); }
    finally { setCreating(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await roomsApi.delete(deleteTarget.id);
      qc.invalidateQueries({ queryKey: ['my-rooms'] });
      toast('Sala eliminada', 'info');
      setDeleteTarget(null);
    } catch { toast('No se pudo eliminar', 'error'); }
    finally { setDeleting(false); }
  };

  const copyCode = (code: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast('Código copiado', 'success');
  };

  const firstName = (user?.username || 'cinéfilo').split(/\s+/)[0];

  return (
    <AppLayout>
      <div className="cielo-root max-w-6xl mx-auto px-5 sm:px-8 py-7 lg:py-9">

        {/* ── Saludo ── */}
        <header className="flex items-center justify-between gap-4 mb-7">
          <div className="flex items-center gap-3.5 min-w-0">
            <Avatar name={user?.username || '?'} size="lg" src={user?.avatar} />
            <div className="min-w-0">
              <h1 className="cielo-display font-bold text-2xl sm:text-3xl leading-tight tracking-tight">
                Hola, <span className="cielo-ink-sky">{firstName}</span>
              </h1>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">Tu panel para crear, entrar y ver en sincronía.</p>
            </div>
          </div>
          <Button size="lg" onClick={() => setShowCreate(true)} className="shrink-0 hidden sm:inline-flex">
            <Plus className="w-5 h-5" /> Crear sala
          </Button>
        </header>

        {/* ── Grid dashboard ── */}
        <div className="grid lg:grid-cols-3 gap-5">

          {/* ════ Columna principal ════ */}
          <div className="lg:col-span-2 space-y-5">

            {/* Panel de acción: empezar una función */}
            <section className="cielo-panel rounded-[1.5rem] p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 cielo-ink-sky" />
                <h2 className="cielo-display font-bold text-lg">Empezá una función</h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {/* Crear */}
                <button onClick={() => setShowCreate(true)}
                  className="group text-left rounded-2xl p-4 cielo-cta
                             transition-transform duration-150 active:scale-[0.98]">
                  <Clapperboard className="w-6 h-6 mb-6 opacity-95" />
                  <p className="cielo-display font-bold text-[15px]">Crear una sala</p>
                  <p className="text-[12.5px] text-white/85">Pegás el enlace de YouTube o Vimeo adentro.</p>
                </button>

                {/* Unirse */}
                <form onSubmit={handleJoin}
                  className="rounded-2xl p-4 bg-[var(--surface-2)] dark:bg-[#222a44] flex flex-col">
                  <Key className="w-6 h-6 mb-6 cielo-ink-sky" />
                  <p className="cielo-display font-bold text-[15px] mb-2">Unirse con código</p>
                  <div className="flex items-center gap-2 rounded-xl bg-[var(--surface)] dark:bg-[#1b2138] border border-[var(--border)] pl-3 pr-1 py-1
                                  focus-within:border-[#5FA6DD] transition-colors">
                    <input
                      type="text" aria-label="Código de sala o link de invitación"
                      placeholder="Código o link…" value={joinCode}
                      onChange={(e) => { setJoinCode(e.target.value); setJoinError(''); }}
                      className="flex-1 min-w-0 bg-transparent text-sm py-1.5 focus:outline-none font-mono uppercase placeholder:normal-case placeholder:font-sans" />
                    <button type="submit" disabled={joining} aria-label="Unirse"
                      className="shrink-0 grid place-items-center w-8 h-8 rounded-lg cielo-cta disabled:opacity-50">
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  {joinError && <p className="text-[var(--error)] text-xs mt-1.5">{joinError}</p>}
                </form>
              </div>
            </section>

            {/* En vivo ahora */}
            {playing.length > 0 && (
              <section className="cielo-panel rounded-[1.5rem] p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-3.5">
                  <span className="online-dot" />
                  <h2 className="cielo-display font-bold text-lg">En vivo ahora</h2>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
                  {playing.map((room) => (
                    <button key={room.id} onClick={() => navigate(`/room/${room.id}`)}
                      className="group snap-start shrink-0 w-56 text-left rounded-2xl p-3.5 bg-[var(--surface-2)] dark:bg-[#222a44]
                                 hover:-translate-y-0.5 transition-transform duration-200">
                      <div className="aspect-video rounded-xl bg-[linear-gradient(135deg,#E6F1FA,#DFE7F7)] dark:bg-[linear-gradient(135deg,#283154,#1d2138)]
                                      grid place-items-center mb-2.5 relative">
                        <Play className="w-7 h-7 cielo-ink-sky fill-current" />
                        <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#E5727E] text-white text-[10px] font-bold">EN VIVO</span>
                      </div>
                      <p className="cielo-display font-bold text-sm truncate">{room.name}</p>
                      <p className="text-[12px] text-[var(--text-muted)]">{room._count?.members || 0} viendo</p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Tus salas */}
            <section className="cielo-panel rounded-[1.5rem] p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="cielo-display font-bold text-lg">
                  Tus salas{rooms.length > 0 && <span className="text-[var(--text-muted)] font-sans font-semibold text-sm"> · {rooms.length}</span>}
                </h2>
                <button onClick={() => navigate('/explore')}
                  className="inline-flex items-center gap-1 text-[13px] font-semibold cielo-ink-sky hover:gap-1.5 transition-[gap]">
                  <Compass className="w-4 h-4" /> Explorar
                </button>
              </div>

              {isLoading ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-2xl" />
                  ))}
                </div>
              ) : rooms.length === 0 ? (
                <EmptyState
                  pose="empty"
                  title="Tu cine está a oscuras"
                  description="Creá tu primera sala y encendé la función para verla con quien quieras."
                  action={<Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Crear sala</Button>}
                />
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {rooms.slice(0, 6).map((room) => (
                    <div key={room.id} onClick={() => navigate(`/room/${room.id}`)}
                      className="group cursor-pointer rounded-2xl p-3.5 bg-[var(--surface-2)] dark:bg-[#222a44]
                                 hover:-translate-y-0.5 transition-transform duration-200 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[linear-gradient(135deg,#DCEBF8,#E6E2FA)] dark:bg-[#2a3354] grid place-items-center shrink-0 relative">
                        <Clapperboard className="w-5 h-5 cielo-ink-sky" />
                        {room.currentVideoId && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#E5727E] border-2 border-[var(--surface-2)]" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="cielo-display font-bold text-sm truncate">{room.name}</p>
                        <div className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
                          <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{room._count?.members || 0}</span>
                          <span aria-hidden>·</span>
                          <span>{room.isPrivate ? 'Privada' : 'Pública'}</span>
                          <span aria-hidden>·</span>
                          <span>{formatDate(room.updatedAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={(e) => copyCode(room.code, room.id, e)} title="Copiar código"
                          className="grid place-items-center w-8 h-8 rounded-lg text-[var(--text-muted)] hover:text-[#2E78B6] hover:bg-[var(--surface)] dark:hover:bg-[#1b2138] transition-colors">
                          {copiedId === room.id ? <Check className="w-4 h-4 text-[#4FBE94]" /> : <Copy className="w-4 h-4" />}
                        </button>
                        {room.ownerId === user?.id && (
                          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: room.id, name: room.name }); }} title="Eliminar"
                            className="grid place-items-center w-8 h-8 rounded-lg text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:bg-[var(--error)]/10 hover:text-[var(--error)] transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* ════ Columna lateral: info siempre accesible ════ */}
          <aside className="space-y-5">
            {/* Compatibilidad */}
            <section className="cielo-panel rounded-[1.5rem] p-5">
              <h3 className="cielo-display font-bold text-base mb-3">Compatible con</h3>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-[#FF0000]/7 grid place-items-center py-3.5 gap-1">
                  <Youtube className="w-6 h-6 text-[#c4302b]" />
                  <span className="text-[12px] font-semibold">YouTube</span>
                </div>
                <div className="rounded-xl bg-[#1AB7EA]/10 grid place-items-center py-3.5 gap-1">
                  <Play className="w-5 h-5 text-[#1199c9] fill-current" />
                  <span className="text-[12px] font-semibold">Vimeo</span>
                </div>
              </div>
              <p className="text-[12px] text-[var(--text-muted)] mt-3 leading-relaxed">Pegá cualquier enlace público dentro de tu sala.</p>
            </section>

            {/* Privacidad */}
            <section className="cielo-panel rounded-[1.5rem] p-5 flex gap-3.5 items-center">
              <img src="/pocine-dream.png?v=20260630" alt="" className="w-16 h-auto select-none shrink-0" draggable={false} />
              <div>
                <h3 className="cielo-display font-bold text-base mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#4FBE94]" /> Sin alojar nada
                </h3>
                <p className="text-[12.5px] text-[var(--text-muted)] leading-relaxed">
                  No subimos ni guardamos videos. Solo sincronizamos el momento. El contenido vive en YouTube o Vimeo.
                </p>
              </div>
            </section>

            {/* Ayuda rápida */}
            <section className="cielo-panel rounded-[1.5rem] p-5">
              <h3 className="cielo-display font-bold text-base mb-3">¿Cómo funciona?</h3>
              <ol className="space-y-2.5">
                {[
                  'Creá una sala o entrá con un código.',
                  'Pegá un enlace de YouTube o Vimeo.',
                  'Miren el mismo segundo, en sincronía.',
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px] text-[var(--text)]">
                    <span className="shrink-0 grid place-items-center w-5 h-5 rounded-full cielo-cta cielo-display text-[11px] font-bold mt-px">{i + 1}</span>
                    {t}
                  </li>
                ))}
              </ol>
            </section>

            {/* Apoyo */}
            <button onClick={() => navigate('/apoyar')}
              className="w-full cielo-panel rounded-[1.5rem] p-4 flex items-center gap-3 text-left
                         hover:-translate-y-0.5 transition-transform duration-200">
              <span className="grid place-items-center w-10 h-10 rounded-xl bg-[#F4B0C9]/20 shrink-0">
                <Heart className="w-5 h-5 text-[#d6688c] fill-[#d6688c]/40" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="cielo-display font-bold text-sm">Apoyá Cinecito</p>
                <p className="text-[12px] text-[var(--text-muted)]">Gratis siempre. Un aporte ayuda.</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
            </button>
          </aside>
        </div>
      </div>

      {/* ── Modal: crear sala ── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nueva sala">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="flex justify-center mb-2">
            <img src="/pocine-celebrate.png?v=20260630" alt="" className="w-32 h-auto select-none" draggable={false} />
          </div>
          <Input label="Nombre de la sala *" placeholder="Ej: Noche de películas"
            value={newRoom.name} onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })} required />
          <Input label="Descripción (opcional)" placeholder="¿Qué van a ver?"
            value={newRoom.description} onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })} />

          <div className="space-y-2">
            <p className="text-sm font-semibold">Modo de la sala</p>
            {ROOM_MODES.map((m) => {
              const active = newRoom.mode === m.key;
              return (
                <button type="button" key={m.key} onClick={() => setNewRoom({ ...newRoom, mode: m.key })}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all
                    ${active ? 'border-[#5FA6DD] bg-[#5FA6DD]/10' : 'border-[var(--border)] hover:border-[#5FA6DD]/40'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{m.label}</p>
                    <p className="text-xs text-[var(--text-muted)] leading-snug">{m.desc}</p>
                  </div>
                  <span className={`w-4 h-4 rounded-full border-2 shrink-0 grid place-items-center ${active ? 'border-[#3E8CCB]' : 'border-[var(--border)]'}`}>
                    {active && <span className="w-2 h-2 rounded-full bg-[#3E8CCB]" />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)} className="flex-1">Cancelar</Button>
            <Button type="submit" loading={creating} className="flex-1" disabled={!newRoom.name.trim()}>Crear sala</Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: confirmar borrado ── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Eliminar sala" size="sm">
        <p className="text-sm text-[var(--text-muted)] mb-5">
          ¿Seguro que querés eliminar <span className="font-bold text-[var(--text)]">{deleteTarget?.name}</span>?
          Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)} className="flex-1">Cancelar</Button>
          <Button variant="danger" loading={deleting} onClick={confirmDelete} className="flex-1">
            <Trash2 className="w-4 h-4" /> Eliminar
          </Button>
        </div>
      </Modal>
    </AppLayout>
  );
}
