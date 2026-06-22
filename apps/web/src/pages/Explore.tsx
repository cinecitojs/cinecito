// apps/web/src/pages/Explore.tsx  — FASE 5
// Explorar y buscar salas públicas

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Film, Users, Play, ArrowRight, Compass, Loader2 } from 'lucide-react';
import { roomsApi } from '../lib/api';
import { Avatar, Badge, Spinner, toast } from '../components/ui';
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
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 animate-slide-up">
          <div className="w-11 h-11 rounded-2xl bg-accent/20 flex items-center justify-center">
            <Compass className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Explorar salas</h1>
            <p className="text-sm text-[var(--text-muted)]">Unite a salas públicas abiertas ahora</p>
          </div>
        </div>

        {/* Buscador */}
        <div className="relative animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Buscar salas por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-2xl border-2 border-[var(--border)] bg-surface dark:bg-dark-surface focus:outline-none focus:border-primary transition-all"
          />
        </div>

        {/* Resultados */}
        {isLoading ? (
          <Spinner />
        ) : rooms.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center gap-3">
            <img src="/pochi-sleep.png?v=20260622" alt="" className="w-52 h-auto" />
            <p className="text-[var(--text)] font-bold">
              {debounced ? 'No se encontraron salas' : 'No hay salas públicas ahora'}
            </p>
            <p className="text-sm text-[var(--text-muted)]">¡Creá una sala pública y aparecerá acá!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {(rooms as any[]).map((room) => (
              <div
                key={room.id}
                onClick={() => handleEnter(room)}
                className="group cursor-pointer bg-surface dark:bg-dark-surface rounded-3xl border-2 border-[var(--border)] p-5 hover:border-primary/40 hover:shadow-cine hover:-translate-y-1 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Film className="w-5 h-5 text-primary" />
                  </div>
                  {room.onlineCount > 0 && (
                    <Badge color="green">
                      <span className="online-dot w-1.5 h-1.5" /> {room.onlineCount} online
                    </Badge>
                  )}
                </div>

                <h3 className="font-bold leading-tight mb-1 line-clamp-1">{room.name}</h3>
                {room.description && (
                  <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-2">{room.description}</p>
                )}

                <div className="flex items-center justify-between text-sm text-[var(--text-muted)] mt-3 pt-3 border-t border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    {room.owner && (
                      <span className="flex items-center gap-1.5">
                        <Avatar name={room.owner.username} size="xs" />
                        <span className="text-xs truncate max-w-20">{room.owner.username}</span>
                      </span>
                    )}
                    {room.currentVideoId && (
                      <span className="flex items-center gap-1 text-primary text-xs">
                        <Play className="w-3 h-3" /> En vivo
                      </span>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
