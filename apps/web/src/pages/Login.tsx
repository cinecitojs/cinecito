// apps/web/src/pages/Login.tsx  — FASE 4 (Etapa 3: reconstrucción del Login)
// Solo capa visual/UX. Auth backend intacto (authApi.login). El campo de contraseña
// con "ojo" se arma inline acá para no tocar el <Input/> compartido.
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft, UserRound,
  Play, Video, MessageCircle,
} from 'lucide-react';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { Button, Input, Modal, toast } from '../components/ui';
import ThemeToggle from '../components/ui/ThemeToggle';

const BRAND_POINTS = [
  { icon: Play,          color: 'text-primary',     label: 'Reproducción en sincronía' },
  { icon: Video,         color: 'text-purple-400',  label: 'Videollamada integrada' },
  { icon: MessageCircle, color: 'text-pink-400',    label: 'Chat con reacciones' },
];

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [form, setForm]         = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showForgot, setShowForgot] = useState(false);

  const update = (key: 'email' | 'password') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await authApi.login(form);
      setAuth(data.token, data.user);
      toast('¡Bienvenido de vuelta! 🎬', 'success');
      navigate('/home');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Credenciales incorrectas');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Panel de marca (desktop) ── */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden flex-col items-center justify-center p-12
                      bg-surface dark:bg-dark-surface border-r border-[var(--border)]">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-56 h-56 rounded-full bg-secondary/10 blur-3xl" />
        </div>
        <img src="/pochi.png" alt="Pochi, la mascota de Cinecito"
          className="relative w-64 h-auto mb-6 drop-shadow-2xl animate-float select-none" draggable={false} />
        <Link to="/" className="relative font-cursive text-4xl text-primary mb-3">Cinecito</Link>
        <p className="relative text-[var(--text-muted)] text-center max-w-xs leading-relaxed mb-8">
          Tu cine privado para ver con la gente que más querés.
        </p>
        <div className="relative flex flex-col gap-3">
          {BRAND_POINTS.map((p) => {
            const Icon = p.icon;
            return (
              <span key={p.label} className="flex items-center gap-2.5 text-sm font-semibold">
                <Icon className={`w-4 h-4 ${p.color}`} /> {p.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Panel del formulario ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative">
        <div className="absolute top-4 right-4"><ThemeToggle /></div>

        <div className="w-full max-w-sm animate-scale-in">
          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <img src="/pochi.png" alt="" className="w-28 h-auto mx-auto mb-2 select-none" draggable={false} />
            <Link to="/" className="font-cursive text-3xl text-primary">Cinecito</Link>
          </div>

          <h1 className="font-display font-bold text-2xl sm:text-3xl mb-1">Iniciar sesión</h1>
          <p className="text-sm text-[var(--text-muted)] mb-7">
            ¿No tenés cuenta?{' '}
            <Link to="/register" className="text-primary font-semibold hover:underline">Registrate gratis</Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Email o usuario"
              type="text" required
              placeholder="tu@email.com o tu usuario"
              autoComplete="username"
              value={form.email}
              onChange={update('email')}
              disabled={loading}
              icon={<Mail className="w-4 h-4" />}
              aria-describedby={error ? 'login-error' : undefined}
            />

            {/* Contraseña con ojo embebido */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="text-sm font-semibold text-[var(--text)]">Contraseña</label>
                <button type="button" onClick={() => setShowForgot(true)}
                  className="text-xs text-primary hover:underline">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'} required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={update('password')}
                  disabled={loading}
                  aria-describedby={error ? 'login-error' : undefined}
                  className="w-full py-2.5 pl-10 pr-11 rounded-2xl border text-sm transition-all
                             bg-[var(--bg)] dark:bg-dark-surface2 border-[var(--border)]
                             focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30
                             disabled:opacity-50"
                />
                <button type="button" onClick={() => setShowPass((s) => !s)}
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-[var(--text-muted)] hover:text-primary transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div id="login-error" role="alert"
                className="flex items-start gap-2 p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full mt-1" size="lg"
              disabled={!form.email || !form.password}>
              Iniciar sesión
            </Button>
          </form>

          {/* Divisor */}
          <div className="flex items-center gap-3 my-5">
            <span className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-[var(--text-muted)]">o</span>
            <span className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <Button variant="secondary" size="lg" className="w-full" onClick={() => navigate('/guest')}>
            <UserRound className="w-4 h-4" /> Entrar como invitado
          </Button>

          <Link to="/"
            className="flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-primary mt-6 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio
          </Link>

          {/* Enlaces legales */}
          <nav aria-label="Enlaces legales"
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-6 pt-4 border-t border-[var(--border)] text-[11px] text-[var(--text-muted)]">
            <Link to="/legal/terminos" className="hover:text-primary transition-colors">Términos</Link>
            <span aria-hidden="true">·</span>
            <Link to="/legal/privacidad" className="hover:text-primary transition-colors">Privacidad</Link>
            <span aria-hidden="true">·</span>
            <Link to="/legal/cookies" className="hover:text-primary transition-colors">Cookies</Link>
          </nav>
        </div>
      </div>

      {/* ── Modal: olvidé contraseña (honesto) ── */}
      <Modal open={showForgot} onClose={() => setShowForgot(false)} title="¿Olvidaste tu contraseña?" size="sm">
        <p className="text-sm text-[var(--text-muted)] mb-5 leading-relaxed">
          El restablecimiento por email todavía no está disponible. Mientras tanto, podés
          <span className="text-[var(--text)] font-semibold"> entrar como invitado</span> o
          <span className="text-[var(--text)] font-semibold"> crear una cuenta nueva</span>.
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={() => { setShowForgot(false); navigate('/guest'); }} className="w-full">
            <UserRound className="w-4 h-4" /> Entrar como invitado
          </Button>
          <Button variant="secondary" onClick={() => { setShowForgot(false); navigate('/register'); }} className="w-full">
            Crear una cuenta
          </Button>
        </div>
      </Modal>
    </div>
  );
}
