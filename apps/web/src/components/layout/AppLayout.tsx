// apps/web/src/components/layout/AppLayout.tsx
// Sistema de navegación "Soft Premiere": rail lateral flotante (desktop),
// barra inferior flotante + top-bar mínima (mobile). Sólo capa visual:
// mismas rutas, mismo logout, mismo ThemeToggle, misma lógica de sesión.

import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Home, Compass, Settings, Heart, Shield, Clapperboard } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { Avatar } from '../ui';
import ThemeToggle from '../ui/ThemeToggle';
import Footer from './Footer';

interface AppLayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export default function AppLayout({ children, hideNav = false }: AppLayoutProps) {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { to: '/home',          icon: Home,     label: 'Inicio' },
    { to: '/explore',       icon: Compass,  label: 'Explorar' },
    { to: '/configuracion', icon: Settings, label: 'Ajustes' },
    ...(user?.role === 'ADMIN' ? [{ to: '/admin', icon: Shield, label: 'Admin' }] : []),
  ];
  const isActive = (to: string) => location.pathname === to;

  // Vista inmersiva (Sala): sin cromo de navegación.
  if (hideNav) return <main className="min-h-screen">{children}</main>;

  const railItem = (to: string, Icon: typeof Home, label: string, tone: 'nav' | 'support' = 'nav') => {
    const active = isActive(to);
    const activeCls = tone === 'support'
      ? 'bg-secondary/15 text-[var(--secondary-fg)]'
      : 'bg-primary/12 text-[var(--primary-dark)] dark:text-primary';
    return (
      <Link key={to} to={to} aria-label={label} aria-current={active ? 'page' : undefined}
        className={`group relative grid place-items-center w-12 h-12 rounded-2xl transition-[background-color,color] duration-150 ease-out
          ${active ? activeCls : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2 hover:text-[var(--text)]'}`}>
        <Icon className="w-5 h-5" />
        <span className="pointer-events-none absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 whitespace-nowrap
                         rounded-xl bg-[var(--text)] text-[var(--bg)] text-xs font-semibold px-2.5 py-1.5
                         opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-cine-sm z-50">
          {label}
        </span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Atmósfera contenida (una sola luz, detrás de todo) */}
      <div className="app-ambient" aria-hidden="true" />

      {/* ── Rail lateral flotante (desktop) ── */}
      <aside className="hidden lg:flex fixed left-4 top-4 bottom-4 z-40 w-[68px] flex-col items-center justify-between
                        py-4 rounded-[26px] bg-surface dark:bg-dark-surface border border-[var(--border)] shadow-cine-sm">
        <div className="flex flex-col items-center gap-3">
          <Link to="/home" aria-label="Cinecito — inicio"
            className="grid place-items-center w-11 h-11 rounded-2xl bg-primary/12 text-[var(--primary-dark)] dark:text-primary
                       hover:brightness-105 transition-[filter] duration-150">
            <Clapperboard className="w-5 h-5" />
          </Link>
          <span className="w-7 h-px bg-[var(--border)]" aria-hidden="true" />
          <nav className="flex flex-col items-center gap-1.5">
            {navLinks.map((l) => railItem(l.to, l.icon, l.label))}
          </nav>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          {railItem('/apoyar', Heart, 'Apoyar', 'support')}
          <ThemeToggle />
          {user && (
            <>
              <Link to="/configuracion" aria-label="Tu perfil y ajustes"
                className="relative grid place-items-center w-12 h-12 rounded-2xl hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2 transition-colors">
                <Avatar name={user.username} src={user.avatar} size="sm" />
              </Link>
              <button onClick={() => { clearAuth(); navigate('/login'); }} aria-label="Cerrar sesión"
                className="grid place-items-center w-12 h-12 rounded-2xl text-[var(--text-muted)]
                           hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2 hover:text-[var(--error)] transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ── Top-bar mínima (mobile/tablet) ── */}
      <header className="lg:hidden sticky top-0 z-30 h-14 flex items-center justify-between px-4
                         bg-surface/85 dark:bg-dark-surface/85 backdrop-blur-md border-b border-[var(--border)]">
        <Link to="/home" className="font-cursive text-xl text-primary leading-none">Cinecito</Link>
        <div className="flex items-center gap-1">
          <Link to="/apoyar" aria-label="Apoyar a Cinecito"
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--secondary-fg)] transition-colors">
            <Heart className="w-5 h-5" />
          </Link>
          <ThemeToggle />
          {user && (
            <Link to="/configuracion" aria-label="Tu perfil y ajustes" className="ml-1">
              <Avatar name={user.username} src={user.avatar} size="xs" />
            </Link>
          )}
        </div>
      </header>

      {/* ── Contenido ── */}
      <div className="relative z-10 lg:pl-[92px] flex flex-col min-h-screen">
        <main className="flex-1 pb-20 sm:pb-24 lg:pb-0">{children}</main>
        <Footer />
      </div>

      {/* ── Barra inferior flotante (mobile/tablet) ── */}
      <nav aria-label="Navegación principal"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex px-2 py-2 gap-1 
                   rounded-t-[22px] bg-surface/95 dark:bg-dark-surface/95 backdrop-blur-md border-t border-[var(--border)] shadow-cine-lg sm:bottom-3 sm:left-3 sm:right-3 sm:rounded-[22px]">
        {navLinks.map((l) => {
          const Icon = l.icon; const active = isActive(l.to);
          return (
            <Link key={l.to} to={l.to} aria-label={l.label} aria-current={active ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-2xl text-[10px] sm:text-[11px] font-semibold transition-colors
                ${active ? 'bg-primary/12 text-[var(--primary-dark)] dark:text-primary' : 'text-[var(--text-muted)]'}`}>
              <Icon className="w-5 h-5" /> <span className="leading-tight">{l.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
