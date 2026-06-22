// apps/web/src/pages/Home.tsx  — FASE 4 (Etapa 2: Inicio como centro de operaciones)
// Solo reconstrucción visual/UX. La lógica de salas (create/join/delete/copy) se mantiene.
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Film, Plus, Key, Users, Play, Trash2, ArrowRight, Copy, Check,
  Compass, Clapperboard, Globe, Lock, Mail, Heart,
} from 'lucide-react';

const ROOM_MODES = [
  { key: 'public'  as const, icon: Globe, label: 'Pública',         desc: 'Aparece en Explorar — cualquiera puede entrar.' },
  { key: 'private' as const, icon: Lock,  label: 'Privada',         desc: 'Se entra con el link de invitación.' },
  { key: 'invite'  as const, icon: Mail,  label: 'Solo invitación', desc: 'Cada ingreso lo aprueba el anfitrión.' },
];
import { roomsApi } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { Button, Input, Modal, Badge, Avatar, Spinner, toast } from '../components/ui';
import AppLayout from '../components/layout/AppLayout';

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

  const [copiedId, setCopiedId]       = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting]       = useState(false);

  const { data: rawRooms = [], isLoading } = useQuery({
    queryKey: ['my-rooms'],
    queryFn:  () => roomsApi.myRooms().then((r) => r.data.rooms as Room[]),
  });

  // Recientes primero
  const rooms = useMemo(
    () => [...rawRooms].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [rawRooms],
  );
  const playing = useMemo(() => rooms.filter((r) => r.currentVideoId), [rooms]);

  const greeting = rooms.length === 0
    ? '¿Qué miramos hoy?'
    : `Tenés ${rooms.length} sala${rooms.length === 1 ? '' : 's'} lista${rooms.length === 1 ? '' : 's'} para la función.`;

  // ── Unirse: acepta código de sala o link de invitación ──
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = joinCode.trim();
    if (!raw) return;

    // Si pegan un link de invitación → llevar a la pantalla de previsualización
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
      toast(`Sala "${data.name}" creada 🎬`, 'success');
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

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* ── Bienvenida ── */}
        <div className="flex items-center gap-4 animate-slide-up">
          <Avatar name={user?.username || '?'} size="lg" src={user?.avatar} />
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-2xl sm:text-3xl leading-tight">
              Hola, <span className="text-primary">{user?.username}</span> 👋
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">{greeting}</p>
          </div>
          <Button size="lg" className="hidden sm:inline-flex shrink-0" onClick={() => setShowCreate(true)}>
            <Plus className="w-5 h-5" /> Crear sala
          </Button>
        </div>

        {/* ── Accesos rápidos ── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          {/* Crear sala (destacada) */}
          <button
            onClick={() => setShowCreate(true)}
            className="text-left rounded-3xl p-5 border-2 border-primary/40 bg-primary/5
                       hover:bg-primary/10 hover:shadow-cine hover:-translate-y-0.5 transition-all"
          >
            <div className="w-11 h-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mb-3">
              <Clapperboard className="w-5 h-5" />
            </div>
            <h3 className="font-bold mb-0.5">Crear sala</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">Elegí el video y abrí tu cine.</p>
          </button>

          {/* Unirse (código o link) */}
          <div className="rounded-3xl p-5 border border-[var(--border)] bg-surface dark:bg-dark-surface">
            <div className="w-11 h-11 rounded-2xl bg-secondary/20 text-pink-500 flex items-center justify-center mb-3">
              <Key className="w-5 h-5" />
            </div>
            <h3 className="font-bold mb-2">Unirse</h3>
            <form onSubmit={handleJoin} className="flex gap-2">
              <input
                type="text"
                aria-label="Código de sala o link de invitación"
                placeholder="Código o link…"
                value={joinCode}
                onChange={(e) => { setJoinCode(e.target.value); setJoinError(''); }}
                className="flex-1 min-w-0 h-9 px-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] dark:bg-dark-surface2
                           text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              <Button type="submit" size="sm" loading={joining} className="shrink-0 px-3" aria-label="Unirse a la sala">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
            {joinError && <p className="text-red-500 text-xs mt-1.5">{joinError}</p>}
          </div>

          {/* Explorar */}
          <button
            onClick={() => navigate('/explore')}
            className="text-left rounded-3xl p-5 border border-[var(--border)] bg-surface dark:bg-dark-surface
                       hover:border-primary/40 hover:shadow-cine hover:-translate-y-0.5 transition-all"
          >
            <div className="w-11 h-11 rounded-2xl bg-accent/20 text-purple-500 flex items-center justify-center mb-3">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="font-bold mb-0.5">Explorar</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">Descubrí salas públicas.</p>
          </button>
        </section>

        {/* ── Reproduciendo ahora (condicional) ── */}
        {playing.length > 0 && (
          <section className="animate-slide-up" style={{ animationDelay: '0.08s' }}>
            <h2 className="font-display font-semibold text-sm text-[var(--text-muted)] mb-3 flex items-center gap-2">
              <span className="online-dot" /> Reproduciendo ahora
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {playing.map((room) => (
                <button
                  key={room.id}
                  onClick={() => navigate(`/room/${room.id}`)}
                  className="flex items-center gap-3 text-left rounded-2xl p-3 border border-[var(--border)]
                             bg-surface dark:bg-dark-surface hover:border-[var(--success)]/50 hover:shadow-cine-sm transition-all"
                >
                  <span className="w-10 h-10 rounded-xl bg-[var(--success)]/15 text-[var(--success)] flex items-center justify-center shrink-0">
                    <Play className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{room.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{room._count?.members || 0} viendo · en vivo</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--success)] shrink-0" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Mis salas ── */}
        <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <Film className="w-5 h-5 text-primary" /> Mis salas
              {rooms.length > 0 && <Badge color="blue">{rooms.length}</Badge>}
            </h2>
            <Button onClick={() => setShowCreate(true)} size="sm" className="sm:hidden">
              <Plus className="w-4 h-4" /> Crear
            </Button>
          </div>

          {isLoading ? (
            <Spinner />
          ) : rooms.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center gap-3">
              <img src="/pochi-sleep.png?v=20260622" alt="Pochi dormido esperando" className="w-48 h-auto select-none" draggable={false} />
              <p className="font-bold">Pochi está esperando la función</p>
              <p className="text-sm text-[var(--text-muted)]">Creá tu primera sala o unite con un código.</p>
              <Button onClick={() => setShowCreate(true)} className="mt-2">
                <Plus className="w-4 h-4" /> Crear mi primera sala
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => navigate(`/room/${room.id}`)}
                  className="group cursor-pointer bg-surface dark:bg-dark-surface rounded-3xl border border-[var(--border)] p-5
                             hover:border-primary/40 hover:shadow-cine hover:-translate-y-1 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Film className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => copyCode(room.code, room.id, e)}
                        className="flex items-center gap-1 px-2 py-1 rounded-xl bg-[var(--surface-2)] dark:bg-dark-surface2 text-xs font-mono font-bold text-[var(--text-muted)] hover:text-primary transition-colors"
                        title="Copiar código"
                      >
                        {copiedId === room.id
                          ? <Check className="w-3 h-3 text-green-500" />
                          : <Copy className="w-3 h-3" />}
                        {room.code}
                      </button>
                      {room.ownerId === user?.id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: room.id, name: room.name }); }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 transition-all"
                          title="Eliminar sala"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold leading-tight mb-3 line-clamp-1">{room.name}</h3>

                  <div className="flex items-center gap-2 flex-wrap text-sm text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {room._count?.members || 0}
                    </span>
                    {room.currentVideoId && (
                      <span className="flex items-center gap-1 text-[var(--success)]">
                        <Play className="w-3.5 h-3.5" /> En vivo
                      </span>
                    )}
                    {room.isPrivate
                      ? <Badge color="purple">Privada</Badge>
                      : <Badge color="green">Pública</Badge>}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
                    <p className="text-xs text-[var(--text-muted)]">Actualizada {formatDate(room.updatedAt)}</p>
                    <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Apoyo voluntario (sutil, no intrusivo) ── */}
        <section className="animate-slide-up" style={{ animationDelay: '0.12s' }}>
          <div className="rounded-3xl border border-[var(--border)] bg-gradient-to-r from-primary/8 via-surface to-secondary/8 dark:from-primary/10 dark:via-dark-surface dark:to-secondary/10 p-5 flex items-center gap-4">
            <img src="/pochi-wink.png?v=20260622" alt="" className="w-14 h-auto select-none shrink-0 hidden sm:block" draggable={false} />
            <div className="flex-1 min-w-0">
              <p className="font-bold">¿Te gusta Cinecito?</p>
              <p className="text-sm text-[var(--text-muted)]">Es gratis y lo seguirá siendo. Si querés, un aporte voluntario ayuda a mantenerlo. 🐾</p>
            </div>
            <div className="flex items-center shrink-0">
              <button onClick={() => navigate('/apoyar')}
                className="group sheen-host inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-primary to-[var(--primary-dark)] text-white font-bold text-sm
                           hover:-translate-y-0.5 hover:brightness-110 active:scale-95 transition-all motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                <Heart className="w-4 h-4 fill-white/80 group-hover:scale-110 transition-transform motion-reduce:transition-none" /> Apoyar
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ── Modal: crear sala ── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nueva sala">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="flex justify-center mb-2">
            <img src="/pochi-wink.png?v=20260622" alt="" className="w-36 h-auto select-none" draggable={false} />
          </div>

          <Input
            label="Nombre de la sala *"
            placeholder="Ej: Noche de películas"
            value={newRoom.name}
            onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
            required
          />
          <Input
            label="Descripción (opcional)"
            placeholder="¿Qué van a ver?"
            value={newRoom.description}
            onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
          />

          <div className="space-y-2">
            <p className="text-sm font-semibold">Modo de la sala</p>
            {ROOM_MODES.map((m) => {
              const Icon = m.icon;
              const active = newRoom.mode === m.key;
              return (
                <button type="button" key={m.key} onClick={() => setNewRoom({ ...newRoom, mode: m.key })}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all
                    ${active ? 'border-primary bg-primary/10' : 'border-[var(--border)] hover:border-primary/40'}`}>
                  <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-primary' : 'text-[var(--text-muted)]'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{m.label}</p>
                    <p className="text-xs text-[var(--text-muted)] leading-snug">{m.desc}</p>
                  </div>
                  <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${active ? 'border-primary' : 'border-[var(--border)]'}`}>
                    {active && <span className="w-2 h-2 rounded-full bg-primary" />}
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
