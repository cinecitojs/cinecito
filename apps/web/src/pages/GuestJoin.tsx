// apps/web/src/pages/GuestJoin.tsx — Cielo compartido
// Entrar como invitado (sin cuenta) usando un código de sala. Lógica intacta.
import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { User, Key, ArrowLeft } from 'lucide-react';
import { authApi, roomsApi } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { Button, Input, toast } from '../components/ui';
import ThemeToggle from '../components/ui/ThemeToggle';
import CieloScene from '../components/layout/CieloScene';

export default function GuestJoin() {
  const navigate  = useNavigate();
  const [params]  = useSearchParams();
  const { setAuth } = useAuthStore();

  const [name, setName]     = useState('');
  const [code, setCode]     = useState(params.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) { setError('Ingresá un nombre (mín. 2 caracteres)'); return; }
    if (code.trim().length < 6) { setError('El código tiene 6 caracteres'); return; }

    setLoading(true); setError('');
    try {
      // 1. Crear token de invitado
      const { data: guestData } = await authApi.guest(name.trim());
      setAuth(guestData.token, { ...guestData.user, guest: true });

      // 2. Unirse a la sala con ese token
      const { data: joinData } = await roomsApi.join({
        code: code.trim().toUpperCase(),
        displayName: name.trim(),
      });

      toast(`¡Bienvenido, ${name.trim()}!`, 'success');
      navigate(`/room/${joinData.room.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'No se pudo entrar a la sala');
      setLoading(false);
    }
  };

  return (
    <div className="cielo-root relative min-h-[100dvh] flex flex-col items-center justify-center px-5 overflow-hidden">
      <CieloScene />
      <div className="absolute top-4 right-4 z-20"><ThemeToggle /></div>
      <Link to="/" className="absolute top-4 left-4 z-20 flex items-center gap-1.5 text-sm font-semibold text-[var(--text-muted)] hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" /> Inicio
      </Link>

      <div className="relative z-10 w-full max-w-sm">
        {/* Mascota sobre nube */}
        <div className="relative flex items-end justify-center h-24 mb-1 z-10 pointer-events-none">
          <div aria-hidden="true" className="absolute bottom-1 w-44 h-14 rounded-full bg-white/85 dark:bg-white/10 blur-lg" />
          <img src="/pocine-hello.png?v=20260630" alt="Pociné saludando"
            className="relative w-24 h-auto select-none animate-float motion-reduce:animate-none
                       drop-shadow-[0_16px_28px_rgba(62,140,203,.25)]" draggable={false} />
        </div>

        <div className="cielo-panel rounded-[1.75rem] p-6 sm:p-7">
          <h1 className="cielo-display font-bold text-2xl text-center">Entrá como invitado</h1>
          <p className="text-sm text-[#54607a] dark:text-[#AEB6D0] text-center mt-1 mb-6">Sin cuenta, sin registro. Solo tu nombre.</p>

          <form onSubmit={handleJoin} className="space-y-4">
            <Input label="Tu nombre" placeholder="¿Cómo te llamás?"
              value={name} onChange={(e) => setName(e.target.value)}
              icon={<User className="w-4 h-4" />} maxLength={30} />
            <Input label="Código de sala" placeholder="ABC123"
              value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
              icon={<Key className="w-4 h-4" />} maxLength={6}
              className="font-mono tracking-widest uppercase" />

            {error && <p className="text-[var(--error)] text-sm">{error}</p>}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Entrar a la sala
            </Button>
          </form>

          <p className="text-center text-xs text-[var(--text-muted)] mt-5">
            ¿Querés guardar tus salas?{' '}
            <Link to="/register" className="cielo-ink-sky font-bold hover:underline">Creá una cuenta</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
