// apps/web/src/store/useAuthStore.ts  — FASE 1A
// Estado de autenticación persistido en localStorage

import { create } from 'zustand';

export interface AuthUser {
  id: string;
  username: string;
  email?: string | null;
  avatar?: string | null;
  guest?: boolean;
  role?: 'USER' | 'HOST' | 'ADMIN';
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;

  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
  setUser: (user: AuthUser) => void;
}

// Restaurar desde localStorage al iniciar
const storedToken = typeof window !== 'undefined' ? localStorage.getItem('cinecito_token') : null;
const storedUser  = typeof window !== 'undefined' ? localStorage.getItem('cinecito_user') : null;

let parsedUser: AuthUser | null = null;
try {
  if (storedUser) parsedUser = JSON.parse(storedUser);
} catch { /* localStorage corrupto */ }

export const useAuthStore = create<AuthState>((set) => ({
  token:           storedToken,
  user:            parsedUser,
  isAuthenticated: !!storedToken && !!parsedUser,

  setAuth: (token, user) => {
    localStorage.setItem('cinecito_token', token);
    localStorage.setItem('cinecito_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem('cinecito_token');
    localStorage.removeItem('cinecito_user');
    set({ token: null, user: null, isAuthenticated: false });
  },

  // Fusiona en lugar de reemplazar: una actualización parcial (p. ej. PUT /me que no
  // devuelve `role`) no debe borrar campos como role/guest del usuario guardado.
  setUser: (user) => {
    set((s) => {
      const merged = { ...s.user, ...user } as AuthUser;
      localStorage.setItem('cinecito_user', JSON.stringify(merged));
      return { user: merged };
    });
  },
}));
