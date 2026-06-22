// apps/web/src/app/App.tsx  — FASE 2
import React, { useEffect, useState, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
// Entrada inicial: eager (primer pintado rápido, sin flash de Suspense).
import Landing    from '../pages/Landing';
import Login      from '../pages/Login';
// Resto: lazy (code-splitting #9) → no pesan en el bundle inicial.
const Register     = lazy(() => import('../pages/Register'));
const Home         = lazy(() => import('../pages/Home'));
const Explore      = lazy(() => import('../pages/Explore'));
const GuestJoin    = lazy(() => import('../pages/GuestJoin'));
const JoinRoom     = lazy(() => import('../pages/JoinRoom'));
const InvitePreview = lazy(() => import('../pages/InvitePreview'));
const Room         = lazy(() => import('../pages/Room'));
const Settings     = lazy(() => import('../pages/Settings'));
const LegalDoc     = lazy(() => import('../pages/LegalDoc'));
const Support      = lazy(() => import('../pages/Support'));
const Admin        = lazy(() => import('../pages/Admin'));
const NotFound     = lazy(() => import('../pages/NotFound'));
import { ToastContainer, Spinner } from '../components/ui';
import ErrorBoundary from '../components/ErrorBoundary';
import { CallProvider } from '../providers/CallProvider';
import CallAudioSink from '../components/CallAudioSink';
import CallWidget from '../components/CallWidget';
import CookieBanner from '../components/CookieBanner';
import SupportModal from '../components/SupportModal';
import { useSupportModal } from '../store/useSupportModal';

// Fallback mientras carga un chunk de ruta (code-splitting).
function RouteFallback() {
  return <div className="min-h-[100dvh] flex items-center justify-center"><Spinner size="lg" /></div>;
}

// ── Theme context ────────────────────────────────────────────
export const ThemeContext = React.createContext<{
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}>({ theme: 'light', toggleTheme: () => {} });

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return (localStorage.getItem('cinecito_theme') as 'light' | 'dark') || 'light';
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('cinecito_theme', theme);
  }, [theme]);
  return { theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) };
}

// ── Ruta protegida ───────────────────────────────────────────
function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

// Modal de apoyo global: cualquier botón "Apoyar" de la app lo abre (→ Ko-fi).
function GlobalSupportModal() {
  const { open, focusTier, closeModal } = useSupportModal();
  return <SupportModal open={open} onClose={closeModal} tier={focusTier} />;
}

// Ruta solo para ADMIN.
function AdminProtected({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'ADMIN') return <Navigate to="/home" replace />;
  return <>{children}</>;
}

export default function App() {
  const { theme, toggle } = useTheme();

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme: toggle }}>
      <CallProvider>
      <ToastContainer />
      <ErrorBoundary scope="app">
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Públicas */}
        <Route path="/"         element={<Landing />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/join"     element={<JoinRoom />} />
        <Route path="/guest"    element={<GuestJoin />} />
        <Route path="/invite/:code" element={<InvitePreview />} />
        {/* Legal — públicas */}
        <Route path="/legal"       element={<LegalDoc />} />
        <Route path="/legal/:slug" element={<LegalDoc />} />
        {/* Apoyo voluntario — pública */}
        <Route path="/apoyar"      element={<Support />} />

        {/* Protegidas */}
        <Route path="/home"      element={<Protected><Home /></Protected>} />
        <Route path="/explore"   element={<Protected><Explore /></Protected>} />
        <Route path="/room/:id"  element={<Protected><ErrorBoundary scope="room"><Room /></ErrorBoundary></Protected>} />
        {/* Perfil quedó unificado dentro de Ajustes (Configuración). */}
        <Route path="/profile"   element={<Navigate to="/configuracion" replace />} />
        <Route path="/configuracion" element={<Protected><Settings /></Protected>} />
        <Route path="/admin"         element={<AdminProtected><Admin /></AdminProtected>} />

        {/* /create → modal en Home */}
        <Route path="/create"    element={<Protected><Navigate to="/home" replace /></Protected>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      </ErrorBoundary>
      <CallAudioSink />
      <CallWidget />
      <CookieBanner />
      <GlobalSupportModal />
      </CallProvider>
    </ThemeContext.Provider>
  );
}
