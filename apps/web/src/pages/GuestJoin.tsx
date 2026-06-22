// apps/web/src/pages/GuestJoin.tsx  — FASE 5
// Entrar como invitado (sin cuenta) usando un código de sala

import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { User, Key, Loader2, ArrowLeft } from 'lucide-react';
import { authApi, roomsApi } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { Button, Input, toast } from '../components/ui';
import ThemeToggle from '../components/ui/ThemeToggle';

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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>

      <Link to="/" className="absolute top-4 left-4 flex items-center gap-2 text-[var(--text-muted)] hover:text-primary transition-colors text-sm font-medium">
        <ArrowLeft className="w-4 h-4" /> Inicio
      </Link>

      <div className="w-full max-w-sm animate-scale-in">
        <div className="text-center mb-8">
          <img src="/pochi.png?v=20260622" alt="" className="w-32 h-auto mx-auto mb-2" />
          <h1 className="font-cursive text-3xl text-primary mb-1">Entrar como invitado</h1>
          <p className="text-[var(--text-muted)] text-sm">Sin cuenta, sin registro. Solo tu nombre.</p>
        </div>

        <div className="bg-surface dark:bg-dark-surface rounded-3xl p-8 shadow-cine border border-[var(--border)]">
          <form onSubmit={handleJoin} className="space-y-4">
            <Input
              label="Tu nombre"
              placeholder="¿Cómo te llamás?"
              value={name}
              onChange={(e) => setName(e.target.value)}
              icon={<User className="w-4 h-4" />}
              maxLength={30}
            />
            <Input
              label="Código de sala"
              placeholder="ABC123"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              icon={<Key className="w-4 h-4" />}
              maxLength={6}
              className="font-mono tracking-widest uppercase"
            />

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Entrar a la sala
            </Button>
          </form>

          <p className="text-center text-xs text-[var(--text-muted)] mt-5">
            ¿Querés guardar tus salas?{' '}
            <Link to="/register" className="text-primary font-semibold hover:underline">
              Creá una cuenta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
