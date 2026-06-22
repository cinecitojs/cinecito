// apps/web/src/pages/InvitePreview.tsx
// Pantalla previa al entrar por invitación (#6): nombre de sala, participantes,
// estado, y botón "Unirse". Si no hay sesión, pide un nombre (invitado).

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Lock, Globe, Loader2, AlertTriangle, LogIn } from 'lucide-react';
import { invitesApi, authApi } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { Button, Input, Spinner, toast, ToastContainer } from '../components/ui';

interface Preview {
  valid: boolean; reason?: string;
  room?: { id: string; name: string; description?: string | null; isPrivate: boolean; memberCount: number; onlineCount: number };
}

const REASONS: Record<string, string> = {
  not_found: 'Esta invitación no existe.',
  revoked: 'Esta invitación fue revocada por el anfitrión.',
  expired: 'Esta invitación venció.',
  max_uses: 'Esta invitación alcanzó su límite de usos.',
};

export default function InvitePreview() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user, setAuth } = useAuthStore();

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [name, setName]       = useState('');

  useEffect(() => {
    if (!code) return;
    invitesApi.info(code)
      .then((r) => setPreview(r.data))
      .catch((e) => setPreview(e.response?.data || { valid: false, reason: 'not_found' }))
      .finally(() => setLoading(false));
  }, [code]);

  const join = async () => {
    if (!code) return;
    setJoining(true);
    try {
      // Si no hay sesión, crear un invitado con el nombre ingresado.
      if (!isAuthenticated) {
        if (name.trim().length < 2) { toast('Ingresá tu nombre (mín. 2)', 'error'); setJoining(false); return; }
        const { data } = await authApi.guest(name.trim());
        setAuth(data.token, data.user);
      }
      const { data } = await invitesApi.accept(code);
      navigate(`/room/${data.room.id}`);
    } catch (e: any) {
      toast(e?.response?.data?.reason ? REASONS[e.response.data.reason] || 'Invitación inválida' : 'No se pudo unir', 'error');
      setJoining(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;

  const invalid = !preview?.valid || !preview?.room;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg)] dark:bg-dark-bg">
      <ToastContainer />
      <div className="w-full max-w-sm bg-surface dark:bg-dark-surface rounded-3xl border border-[var(--border)] shadow-cine p-6 text-center animate-scale-in">
        <img src="/pochi.png?v=20260622" alt="" className="w-28 h-auto mx-auto mb-2" />

        {invalid ? (
          <>
            <AlertTriangle className="w-10 h-10 text-[var(--warning)] mx-auto mb-2" />
            <h1 className="font-bold text-lg mb-1">Invitación no disponible</h1>
            <p className="text-sm text-[var(--text-muted)] mb-5">{REASONS[preview?.reason || 'not_found']}</p>
            <Button variant="secondary" onClick={() => navigate('/')} className="w-full">Ir al inicio</Button>
          </>
        ) : (
          <>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Te invitaron a</p>
            <h1 className="font-cursive text-3xl text-primary mb-1">{preview!.room!.name}</h1>
            {preview!.room!.description && (
              <p className="text-sm text-[var(--text-muted)] mb-2">{preview!.room!.description}</p>
            )}
            <div className="flex items-center justify-center gap-3 text-xs text-[var(--text-muted)] mb-5">
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {preview!.room!.onlineCount} en línea</span>
              <span className="flex items-center gap-1">
                {preview!.room!.isPrivate ? <><Lock className="w-3.5 h-3.5" /> Privada</> : <><Globe className="w-3.5 h-3.5" /> Pública</>}
              </span>
            </div>

            {!isAuthenticated && (
              <Input placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)}
                className="mb-3 text-center" maxLength={30} />
            )}

            <Button onClick={join} loading={joining} className="w-full" size="lg">
              <LogIn className="w-4 h-4" /> {isAuthenticated ? `Unirse como ${user?.username}` : 'Unirse'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
