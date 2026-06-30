// apps/web/src/pages/JoinRoom.tsx — Cielo compartido (lógica de join intacta)
import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Key, Loader2, ArrowLeft } from 'lucide-react';
import { roomsApi } from '../lib/api';
import ThemeToggle from '../components/ui/ThemeToggle';
import CieloScene from '../components/layout/CieloScene';

export default function JoinRoom() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [code, setCode]   = useState(params.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true); setError('');
    try {
      const { data } = await roomsApi.join({ code: code.trim().toUpperCase() });
      navigate(`/room/${data.room.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Código inválido o sala no encontrada');
    } finally {
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
          <h1 className="cielo-display font-bold text-2xl text-center">Unite a una sala</h1>
          <p className="text-sm text-[#54607a] dark:text-[#AEB6D0] text-center mt-1 mb-6">Pegá el código de 6 caracteres.</p>

          <form onSubmit={handleJoin} className="space-y-4">
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 cielo-ink-sky" />
              <input type="text" maxLength={6} required placeholder="ABC123"
                value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)] dark:bg-dark-surface2
                           text-center text-2xl tracking-[0.3em] font-mono uppercase
                           focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary" />
            </div>
            {error && <p className="text-[var(--error)] text-sm text-center">{error}</p>}
            <button type="submit" disabled={loading || code.length < 6}
              className="cielo-cta cielo-display w-full py-3.5 rounded-full font-semibold disabled:opacity-50
                         flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando…</> : <><Key className="w-4 h-4" /> Unirse</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
