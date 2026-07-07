// apps/web/src/pages/Login.tsx — Cielo compartido (auth backend intacto: authApi.login)
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft, UserRound } from 'lucide-react';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { Button, Input, Modal, toast } from '../components/ui';
import ThemeToggle from '../components/ui/ThemeToggle';
import CieloScene from '../components/layout/CieloScene';

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
      toast('Qué bueno verte de nuevo', 'success');
      navigate('/home');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Credenciales incorrectas');
    } finally { setLoading(false); }
  };

  return (
    <div className="cielo-root relative min-h-[100dvh] flex flex-col items-center justify-center px-5 py-10 overflow-hidden">
      <CieloScene />
      <div className="absolute top-4 right-4 z-20"><ThemeToggle /></div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Mascota sobre nube */}
        <div className="relative flex items-end justify-center h-24 mb-1 z-10 pointer-events-none">
          <div aria-hidden="true" className="absolute bottom-1 w-44 h-14 rounded-full bg-white/85 dark:bg-white/10 blur-lg" />
          <img src="/pocine-hello.png?v=20260630" alt="Pociné saludando"
            className="relative w-24 h-auto select-none animate-float motion-reduce:animate-none
                       drop-shadow-[0_16px_28px_rgba(62,140,203,.25)]" draggable={false} />
        </div>

        <div className="cielo-panel rounded-[1.75rem] p-6 sm:p-7">
          <h1 className="cielo-display font-bold text-2xl sm:text-[1.7rem] text-center">Qué bueno verte</h1>
          <p className="text-sm text-[#54607a] dark:text-[#AEB6D0] text-center mt-1 mb-6">
            ¿No tenés cuenta?{' '}
            <Link to="/register" className="cielo-ink-sky font-bold hover:underline">Registrate gratis</Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Email o usuario" type="text" required
              placeholder="tu@email.com o tu usuario" autoComplete="username"
              value={form.email} onChange={update('email')} disabled={loading}
              icon={<Mail className="w-4 h-4" />}
              aria-describedby={error ? 'login-error' : undefined}
            />

            {/* Contraseña con ojo embebido */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="text-sm font-semibold text-[var(--text)]">Contraseña</label>
                <button type="button" onClick={() => setShowForgot(true)}
                  className="text-xs cielo-ink-sky hover:underline">¿La olvidaste?</button>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="login-password" type={showPass ? 'text' : 'password'} required
                  placeholder="••••••••" autoComplete="current-password"
                  value={form.password} onChange={update('password')} disabled={loading}
                  aria-describedby={error ? 'login-error' : undefined}
                  className="w-full py-2.5 pl-10 pr-11 rounded-2xl border text-sm transition-all
                             bg-[var(--bg)] dark:bg-dark-surface2 border-[var(--border)]
                             focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
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
                className="flex items-start gap-2 p-3 rounded-2xl bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full mt-1" size="lg"
              disabled={!form.email || !form.password}>
              Iniciar sesión
            </Button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <span className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-[var(--text-muted)]">o</span>
            <span className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <Button variant="secondary" size="lg" className="w-full" onClick={() => navigate('/guest')}>
            <UserRound className="w-4 h-4" /> Entrar como invitado
          </Button>
        </div>

        <Link to="/"
          className="flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-primary mt-5 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio
        </Link>

        <nav aria-label="Enlaces legales"
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-4 text-[11px] text-[var(--text-muted)]">
          <Link to="/legal/terminos" className="hover:text-primary transition-colors">Términos</Link>
          <Link to="/legal/privacidad" className="hover:text-primary transition-colors">Privacidad</Link>
          <Link to="/legal/cookies" className="hover:text-primary transition-colors">Cookies</Link>
        </nav>
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
