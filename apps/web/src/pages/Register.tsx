// apps/web/src/pages/Register.tsx  — FASE 4 (Etapa 4: reconstrucción del Registro)
// Split-screen coherente con Login pero con identidad de onboarding propia.
// Solo capa visual/UX. Auth backend intacto (authApi.register). Campos con adornos
// se arman inline acá para no tocar el <Input/> compartido.
import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User, Mail, Lock, Eye, EyeOff, Check, CheckCircle2, AlertCircle, ArrowLeft, UserRound,
} from 'lucide-react';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { Button, toast } from '../components/ui';
import ThemeToggle from '../components/ui/ThemeToggle';

const BENEFITS = [
  'Salas de cine ilimitadas',
  'Invitá amigos con un código',
  'Tus salas guardadas para volver',
  'Chat, voz y reacciones en vivo',
];

const EMAIL_RE = /^\S+@\S+\.\S+$/;

function passwordStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (!pw) return { level: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 6)  score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const level = (score <= 1 ? 1 : score <= 3 ? 2 : 3) as 1 | 2 | 3;
  const map = {
    1: { label: 'Débil',  color: '#FB6F73' },
    2: { label: 'Media',  color: '#FFB845' },
    3: { label: 'Fuerte', color: '#34C77B' },
  };
  return { level, ...map[level] };
}

export default function Register() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  // Consentimiento: Términos y Privacidad son obligatorios; comunicaciones es opcional.
  const [acceptTerms, setAcceptTerms]     = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [marketing, setMarketing]         = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  // ── Validez por campo (tiempo real) ──
  const v = useMemo(() => {
    const usernameValid = form.username.trim().length >= 2;
    const emailValid    = form.email === '' || EMAIL_RE.test(form.email);
    const passwordValid = form.password.length >= 6;
    const confirmValid  = form.confirm.length > 0 && form.confirm === form.password;
    return {
      usernameValid, emailValid, passwordValid, confirmValid,
      formValid: usernameValid && emailValid && passwordValid && confirmValid && acceptTerms && acceptPrivacy,
    };
  }, [form, acceptTerms, acceptPrivacy]);

  const strength = passwordStrength(form.password);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (generalError) setGeneralError('');
  };
  const blur = (key: string) => () => setTouched((t) => ({ ...t, [key]: true }));

  // mostrar error si el campo fue tocado o tiene contenido, y es inválido
  const showErr = (key: 'username' | 'email' | 'password' | 'confirm', valid: boolean) =>
    (touched[key] || form[key] !== '') && !valid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ username: true, email: true, password: true, confirm: true });
    if (!v.formValid) return;
    setGeneralError(''); setLoading(true);
    try {
      const { data } = await authApi.register({
        username: form.username.trim(),
        email: form.email || undefined,
        password: form.password,
        acceptedTerms: acceptTerms,
        acceptedPrivacy: acceptPrivacy,
        marketingOptIn: marketing,
      });
      setAuth(data.token, data.user);
      toast('¡Cuenta creada! Bienvenido a Cinecito 🎬', 'success');
      navigate('/home');
    } catch (err: any) {
      setGeneralError(err.response?.data?.error || 'No se pudo crear la cuenta');
    } finally { setLoading(false); }
  };

  const fieldBorder = (valid: boolean, key: 'username' | 'email' | 'password' | 'confirm') =>
    showErr(key, valid)
      ? 'border-red-400 focus:ring-red-200'
      : valid && form[key] !== ''
        ? 'border-[var(--success)]/60 focus:ring-primary/30'
        : 'border-[var(--border)] focus:border-primary focus:ring-primary/30';

  const inputBase =
    'w-full py-2.5 pl-10 rounded-2xl border text-sm transition-all bg-[var(--bg)] dark:bg-dark-surface2 focus:outline-none focus:ring-2 disabled:opacity-50';

  return (
    <div className="min-h-screen flex">
      {/* ── Panel de beneficios (desktop) ── */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden flex-col justify-center p-12
                      bg-surface dark:bg-dark-surface border-r border-[var(--border)]">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -bottom-10 -left-10 w-72 h-72 rounded-full bg-secondary/15 blur-3xl" />
          <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="relative flex items-center gap-4 mb-7">
          <img src="/pochi-wink.png" alt="Pochi guiñando un ojo"
            className="w-24 h-auto drop-shadow-2xl animate-float select-none" draggable={false} />
          <div>
            <Link to="/" className="font-cursive text-3xl text-primary">Cinecito</Link>
            <p className="text-sm text-[var(--text-muted)] mt-1">Sumate, te estábamos esperando 🐾</p>
          </div>
        </div>

        <h2 className="relative font-display font-bold text-xl mb-4">Lo que obtenés al crear tu cuenta</h2>
        <ul className="relative flex flex-col gap-3">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-3 text-sm font-semibold">
              <CheckCircle2 className="w-5 h-5 text-[var(--success)] shrink-0" /> {b}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Panel del formulario ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative">
        <div className="absolute top-4 right-4"><ThemeToggle /></div>

        <div className="w-full max-w-sm animate-scale-in">
          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-6">
            <img src="/pochi-wink.png" alt="" className="w-24 h-auto mx-auto mb-2 select-none" draggable={false} />
            <Link to="/" className="font-cursive text-3xl text-primary">Cinecito</Link>
          </div>

          <h1 className="font-display font-bold text-2xl sm:text-3xl mb-1">Creá tu cuenta</h1>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            ¿Ya tenés una?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">Iniciá sesión</Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            {/* Usuario */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-username" className="text-sm font-semibold">Usuario</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"><User className="w-4 h-4" /></span>
                <input id="reg-username" type="text" placeholder="tuusername" autoComplete="username"
                  value={form.username} onChange={set('username')} onBlur={blur('username')} disabled={loading}
                  aria-invalid={showErr('username', v.usernameValid) || undefined}
                  aria-describedby={showErr('username', v.usernameValid) ? 'reg-username-err' : undefined}
                  className={`${inputBase} pr-10 ${fieldBorder(v.usernameValid, 'username')}`} />
                {v.usernameValid && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--success)]" />
                )}
              </div>
              {showErr('username', v.usernameValid) &&
                <p id="reg-username-err" className="text-xs text-red-500">Mínimo 2 caracteres</p>}
            </div>

            {/* Email opcional */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-email" className="text-sm font-semibold flex items-center gap-1.5">
                Email <span className="text-xs font-normal text-[var(--text-muted)]">· opcional</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"><Mail className="w-4 h-4" /></span>
                <input id="reg-email" type="email" placeholder="tu@email.com" autoComplete="email"
                  value={form.email} onChange={set('email')} onBlur={blur('email')} disabled={loading}
                  aria-invalid={showErr('email', v.emailValid) || undefined}
                  aria-describedby={showErr('email', v.emailValid) ? 'reg-email-err' : undefined}
                  className={`${inputBase} pr-10 ${fieldBorder(v.emailValid, 'email')}`} />
                {form.email !== '' && v.emailValid && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--success)]" />
                )}
              </div>
              {showErr('email', v.emailValid) &&
                <p id="reg-email-err" className="text-xs text-red-500">Email inválido</p>}
            </div>

            {/* Contraseña */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-password" className="text-sm font-semibold">Contraseña</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"><Lock className="w-4 h-4" /></span>
                <input id="reg-password" type={showPass ? 'text' : 'password'} placeholder="••••••••" autoComplete="new-password"
                  value={form.password} onChange={set('password')} onBlur={blur('password')} disabled={loading}
                  aria-invalid={showErr('password', v.passwordValid) || undefined}
                  aria-describedby={showErr('password', v.passwordValid) ? 'reg-password-err' : undefined}
                  className={`${inputBase} pr-11 ${fieldBorder(v.passwordValid, 'password')}`} />
                <button type="button" onClick={() => setShowPass((s) => !s)}
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-primary transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Medidor de fortaleza */}
              {form.password !== '' && (
                <div className="flex items-center gap-2" aria-hidden="true">
                  <div className="flex-1 flex gap-1.5">
                    {[1, 2, 3].map((i) => (
                      <span key={i} className="h-1.5 flex-1 rounded-full transition-colors"
                        style={{ background: i <= strength.level ? strength.color : 'var(--border)' }} />
                    ))}
                  </div>
                  <span className="text-[11px] font-bold min-w-[44px] text-right" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}
              {showErr('password', v.passwordValid) &&
                <p id="reg-password-err" className="text-xs text-red-500">Mínimo 6 caracteres</p>}
            </div>

            {/* Confirmar */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-confirm" className="text-sm font-semibold">Confirmar contraseña</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"><Lock className="w-4 h-4" /></span>
                <input id="reg-confirm" type={showConfirm ? 'text' : 'password'} placeholder="••••••••" autoComplete="new-password"
                  value={form.confirm} onChange={set('confirm')} onBlur={blur('confirm')} disabled={loading}
                  aria-invalid={showErr('confirm', v.confirmValid) || undefined}
                  aria-describedby={showErr('confirm', v.confirmValid) ? 'reg-confirm-err' : undefined}
                  className={`${inputBase} pr-16 ${fieldBorder(v.confirmValid, 'confirm')}`} />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {v.confirmValid && <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />}
                  <button type="button" onClick={() => setShowConfirm((s) => !s)}
                    aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="text-[var(--text-muted)] hover:text-primary transition-colors">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {showErr('confirm', v.confirmValid) &&
                <p id="reg-confirm-err" className="text-xs text-red-500">Las contraseñas no coinciden</p>}
            </div>

            {/* Consentimiento legal */}
            <div className="flex flex-col gap-2.5 pt-1">
              {/* Obligatorio: Términos */}
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <button type="button" role="checkbox" aria-checked={acceptTerms}
                  onClick={() => setAcceptTerms((a) => !a)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all
                    ${acceptTerms ? 'bg-primary border-primary' : 'border-[var(--border)] hover:border-primary'}`}>
                  {acceptTerms && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
                <span className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Acepto los{' '}
                  <a href="/legal/terminos" target="_blank" rel="noreferrer" className="text-primary hover:underline">Términos y Condiciones</a>.
                  <span className="text-red-400"> *</span>
                </span>
              </label>
              {/* Obligatorio: Privacidad */}
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <button type="button" role="checkbox" aria-checked={acceptPrivacy}
                  onClick={() => setAcceptPrivacy((a) => !a)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all
                    ${acceptPrivacy ? 'bg-primary border-primary' : 'border-[var(--border)] hover:border-primary'}`}>
                  {acceptPrivacy && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
                <span className="text-xs text-[var(--text-muted)] leading-relaxed">
                  He leído la{' '}
                  <a href="/legal/privacidad" target="_blank" rel="noreferrer" className="text-primary hover:underline">Política de Privacidad</a>.
                  <span className="text-red-400"> *</span>
                </span>
              </label>
              {/* Opcional: comunicaciones */}
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <button type="button" role="checkbox" aria-checked={marketing}
                  onClick={() => setMarketing((a) => !a)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all
                    ${marketing ? 'bg-primary border-primary' : 'border-[var(--border)] hover:border-primary'}`}>
                  {marketing && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
                <span className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Deseo recibir comunicaciones sobre novedades y mejoras. <span className="opacity-70">(Opcional)</span>
                </span>
              </label>
            </div>

            {generalError && (
              <div role="alert" className="flex items-start gap-2 p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{generalError}</span>
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full mt-1" size="lg" disabled={!v.formValid}>
              Crear cuenta
            </Button>
          </form>

          <p className="text-center text-xs text-[var(--text-muted)] mt-5">
            ¿Solo querés probar?{' '}
            <button type="button" onClick={() => navigate('/guest')} className="text-accent-fg dark:text-accent font-semibold hover:underline">
              Entrá como invitado
            </button>
          </p>

          <Link to="/"
            className="flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-primary mt-4 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
