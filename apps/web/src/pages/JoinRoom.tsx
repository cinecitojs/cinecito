// apps/web/src/pages/JoinRoom.tsx  — FASE 1A
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Key, Loader2 } from 'lucide-react';
import { roomsApi } from '../lib/api';

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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-scale-in">
        <div className="text-center mb-8">
          <img src="/pochi.png" alt="" className="w-32 h-auto mx-auto mb-3" />
          <h1 className="font-cursive text-3xl text-primary mb-1">Unirse a sala</h1>
          <p className="text-[var(--text-muted)] text-sm">Ingresá el código de 6 caracteres</p>
        </div>
        <div className="bg-surface dark:bg-dark-surface rounded-3xl p-8 shadow-cine border border-[var(--border)]">
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
              <input type="text" maxLength={6} required
                placeholder="ABC123"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)] dark:bg-dark-surface2 text-center text-2xl tracking-widest font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button type="submit" disabled={loading || code.length < 6}
              className="w-full py-3 rounded-2xl bg-primary text-white font-bold hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-cine">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</> : <><Key className="w-4 h-4" /> Unirse</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
