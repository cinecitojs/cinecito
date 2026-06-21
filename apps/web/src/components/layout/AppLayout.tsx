// apps/web/src/components/layout/AppLayout.tsx  — FASE 2
// Navbar + decoraciones de fondo + ThemeToggle

import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Home, Compass, Settings, Heart, Shield } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { Avatar } from '../ui';
import ThemeToggle from '../ui/ThemeToggle';
import Footer from './Footer';
import { SupporterBadge } from '../SupporterBadge';
import { useSupporter } from '../../hooks/useSupporter';
import { displayTierOf } from '../../lib/supporterRewards';
import { ThemeContext } from '../../app/App';

interface AppLayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export default function AppLayout({ children, hideNav = false }: AppLayoutProps) {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: supporter } = useSupporter();

  const navLinks = [
    { to: '/home',          icon: <Home     className="w-4 h-4" />, label: 'Inicio' },
    { to: '/explore',       icon: <Compass  className="w-4 h-4" />, label: 'Explorar' },
    { to: '/configuracion', icon: <Settings className="w-4 h-4" />, label: 'Ajustes' },
    ...(user?.role === 'ADMIN'
      ? [{ to: '/admin', icon: <Shield className="w-4 h-4" />, label: 'Admin' }]
      : []),
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Fondo decorativo (estático) ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/3 w-80 h-80 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-accent/8 blur-3xl" />
      </div>

      {/* ── Navbar ── */}
      {!hideNav && (
        <nav className="relative z-20 border-b border-[var(--border)] bg-surface/80 dark:bg-dark-surface/80 backdrop-blur-sm sticky top-0">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
            {/* Logo */}
            <Link to="/home" className="flex items-center gap-2 shrink-0">
              <span className="font-cursive text-xl text-primary leading-none">Cinecito</span>
            </Link>

            {/* Nav links — desktop */}
            <div className="hidden md:flex items-center gap-1 ml-4">
              {navLinks.map((l) => (
                <Link key={l.to} to={l.to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all
                    ${location.pathname === l.to
                      ? 'bg-primary/10 text-primary'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2'
                    }`}>
                  {l.icon} {l.label}
                </Link>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Link to="/apoyar" aria-label="Apoyar a Cinecito" title="Apoyar a Cinecito"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-sm font-semibold transition-colors
                  ${location.pathname === '/apoyar'
                    ? 'bg-primary/10 text-primary'
                    : 'text-[var(--text-muted)] hover:text-primary hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2'}`}>
                <Heart className="w-4 h-4" /> <span className="hidden sm:inline">Apoyar</span>
              </Link>
              <ThemeToggle />

              {user && (
                <>
                  <Link to="/configuracion" aria-label="Tu perfil y ajustes"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-2xl hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2 transition-colors">
                    <Avatar name={user.username} src={user.avatar} size="xs" />
                    <span className="text-sm font-semibold hidden sm:inline">{user.username}</span>
                    {supporter?.tier && <SupporterBadge tier={displayTierOf(supporter)} size="xs" showLabel={false} />}
                  </Link>
                  <button onClick={() => { clearAuth(); navigate('/login'); }}
                    className="p-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 text-[var(--text-muted)] hover:text-red-500 transition-colors">
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mobile bottom nav — solo en rutas de app */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border)] bg-surface/95 dark:bg-dark-surface/95 backdrop-blur-sm flex">
            {navLinks.map((l) => (
              <Link key={l.to} to={l.to}
                className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-semibold transition-colors
                  ${location.pathname === l.to ? 'text-primary' : 'text-[var(--text-muted)]'}`}>
                {l.icon} {l.label}
              </Link>
            ))}
          </div>
        </nav>
      )}

      {/* ── Contenido ── */}
      <main className={`relative z-10 flex-1 ${!hideNav ? 'pb-16 md:pb-0' : ''}`}>
        {children}
      </main>

      {/* ── Footer global (oculto en vista inmersiva sin nav) ── */}
      {!hideNav && (
        <div className="pb-16 md:pb-0">
          <Footer />
        </div>
      )}
    </div>
  );
}
