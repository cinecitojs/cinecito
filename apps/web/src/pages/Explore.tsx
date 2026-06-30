// apps/web/src/pages/Explore.tsx
// Explorar/buscar salas públicas — sistema "Soft Premiere" (editorial + póster).
// Sólo capa visual: misma query, mismo debounce, mismo handleEnter.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowRight, Film } from 'lucide-react';
import { roomsApi } from '../lib/api';
import { Avatar, Skeleton, EmptyState, toast } from '../components/ui';
import AppLayout from '../components/layout/AppLayout';

export default function Explore() {
  const navigate = useNavigate();
  const [search, setSearch]       = useState('');
  const [debounced, setDebounced] = useState('');

  // Debounce de búsqueda
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['public-rooms', debounced],
    queryFn:  () => roomsApi.publicRooms(debounced || undefined).then((r) => r.data.rooms),
  });

  const handleEnter = async (room: any) => {
    try {
      const { data } = await roomsApi.join({ code: room.code });
      navigate(`/room/${data.room.id}`);
    } catch (err: any) {
      toast(err.response?.data?.error || 'No se pudo entrar', 'error');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 lg:py-14">
        {/* ── Encabezado editorial ── */}
        <header className="mb-8">
          <h1 className="font-display font-bold text-3xl sm:text-[2.5rem] leading-[1.05] tracking-tight">Explorar salas</h1>
          <p className="text-[var(--text-muted)] mt-2">Entrá a salas públicas que están abiertas ahora mismo.</p>
        </header>

        {/* ── Buscador ── */}
        <div className="relative mb-10 max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            aria-label="Buscar salas por nombre"
            placeholder="Buscar por nombre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-2xl border border-[var(--border)] bg-surface dark:bg-dark-surface
                       text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                       transition-[border-color,box-shadow] duration-150 ease-out"
          />
        </div>

        {/* ── Resultados ── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-[20px] border border-[var(--border)] overflow-hidden bg-surface dark:bg-dark-surface">
                <Skeleton className="h-24 rounded-none" />
                <div className="p-4"><Skeleton className="w-3/4 h-5 mb-3" /><Skeleton className="w-1/2 h-4" /></div>
              </div>
            ))}
          </div>
        ) : rooms.length === 0 ? (
          debounced ? (
            <EmptyState
              pose="empty"
              title="No encontramos esa función"
              description="Pociné buscó por toda la cartelera. Probá con otro título."
            />
          ) : (
            <EmptyState
              pose="search"
              title="La cartelera está tranquila"
              description="Cuando alguien abra una sala pública, va a aparecer acá para sumarte."
            />
          )
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(rooms as any[]).map((room) => (
              <div
                key={room.id}
                onClick={() => handleEnter(room)}
                className="group cursor-pointer rounded-[20px] border border-[var(--border)] overflow-hidden bg-surface dark:bg-dark-surface
                           hover:border-primary/40 hover:-translate-y-1 hover:shadow-cine transition-[transform,box-shadow,border-color] duration-200 ease-out"
              >
                {/* Póster */}
                <div className="relative h-24 flex items-center justify-center bg-gradient-to-br from-primary/12 to-accent/12 dark:from-primary/15 dark:to-accent/15">
                  <Film className="w-8 h-8 text-[var(--primary-dark)] dark:text-primary opacity-60" />
                  {room.onlineCount > 0 && (
                    <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--success)] text-white text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" /> {room.onlineCount} online
                    </span>
                  )}
                </div>
                {/* Cuerpo */}
                <div className="p-4">
                  <h3 className="font-display font-bold leading-tight line-clamp-1 mb-1">{room.name}</h3>
                  {room.description && <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-3">{room.description}</p>}
                  <div className="flex items-center justify-between gap-2 mt-1">
                    {room.owner ? (
                      <span className="flex items-center gap-1.5 min-w-0">
                        <Avatar name={room.owner.username} size="xs" />
                        <span className="text-xs text-[var(--text-muted)] truncate max-w-[8rem]">{room.owner.username}</span>
                      </span>
                    ) : <span />}
                    <span className="inline-flex items-center gap-1 text-[var(--primary-dark)] dark:text-primary text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      Entrar <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
