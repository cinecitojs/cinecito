// apps/web/src/lib/api.ts  — FASE 1A
// Cliente HTTP con JWT automático y manejo de errores

import axios from 'axios';
import { SERVER_URL } from './serverUrl';

const BASE = SERVER_URL;

const api = axios.create({
  baseURL: BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Adjuntar token automáticamente ──────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cinecito_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Manejar 401 globalmente → logout ────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('cinecito_token');
      localStorage.removeItem('cinecito_user');
      // Redirigir al login solo si no estamos ya ahí
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

export default api;

// ── Helpers tipados por recurso ──────────────────────────────

export const authApi = {
  register: (data: {
    email?: string; username: string; password: string;
    acceptedTerms: boolean; acceptedPrivacy: boolean; marketingOptIn?: boolean;
  }) => api.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  me: () => api.get('/auth/me'),

  updateProfile: (data: { username?: string; avatar?: string }) =>
    api.put('/auth/me', data),

  guest: (displayName: string) =>
    api.post('/auth/guest', { displayName }),

  // Eliminación de cuenta (derecho de supresión). password requerido si la cuenta tiene una.
  deleteAccount: (password?: string) =>
    api.delete('/auth/account', { data: { password } }),
};

export const legalApi = {
  versions: () => api.get('/legal/versions'),
  consents: () => api.get('/legal/consents'),
  recordConsent: (data: { docType: 'terms' | 'privacy' | 'cookies' | 'marketing'; accepted: boolean; detail?: Record<string, boolean> }) =>
    api.post('/legal/consents', data),
};

export const reportsApi = {
  create: (data: {
    targetType: 'user' | 'room' | 'message' | 'link';
    targetId: string;
    reason: 'copyright' | 'spam' | 'harassment' | 'impersonation' | 'illegal' | 'other';
    details?: string;
    context?: string;
  }) => api.post('/reports', data),

  // Solo ADMIN
  list: (status?: string) => api.get('/reports', { params: status ? { status } : {} }),
  resolve: (id: string, status: 'open' | 'reviewing' | 'actioned' | 'dismissed') =>
    api.patch(`/reports/${id}`, { status }),
};

export const adminApi = {
  overview: () => api.get('/admin/overview'),
  users: (search?: string) => api.get('/admin/users', { params: search ? { search } : {} }),
  setUserStatus: (id: string, data: { status: 'active' | 'suspended' | 'blocked'; reason?: string; days?: number }) =>
    api.post(`/admin/users/${id}/status`, data),
  grantUser: (id: string, tier: 'amigo' | 'colaborador' | 'patrocinador') =>
    api.post(`/admin/users/${id}/grant`, { tier }),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  rooms: (search?: string) => api.get('/admin/rooms', { params: search ? { search } : {} }),
};

export const supportApi = {
  // Config del servidor: si hay proveedor de pago configurado (checkout) y stats opcionales.
  config: () => api.get('/support/config'),
  // Registra una INTENCIÓN de aporte (no cobra). Devuelve checkoutUrl si hay proveedor.
  contribute: (data: {
    tier: 'amigo' | 'colaborador' | 'patrocinador';
    amount: number;
    frequency: 'once' | 'monthly';
    message?: string;
    recognition?: boolean;
  }) => api.post('/support/contributions', data),

  // Muro de agradecimientos público (supporters no anónimos).
  wall: () => api.get('/support/wall'),
  // Estado de supporter del usuario (recompensas cosméticas desbloqueadas).
  me: () => api.get('/support/me'),
  // Cambiar preferencias cosméticas: tema de sala, anonimato, insignia.
  updateMe: (data: { theme?: string | null; anonymous?: boolean; badge?: string | null }) =>
    api.patch('/support/me', data),
  // Solo desarrollo (guardado por env/ADMIN): conceder un tier para probar recompensas.
  devGrant: (tier: 'amigo' | 'colaborador' | 'patrocinador') =>
    api.post('/support/dev/grant', { tier }),
};

export const roomsApi = {
  create: (data: { name: string; description?: string; isPrivate?: boolean; mode?: 'public' | 'private' | 'invite' }) =>
    api.post('/rooms', data),

  join: (data: { code: string; displayName?: string }) =>
    api.post('/rooms/join', data),

  getById: (id: string) => api.get(`/rooms/${id}`),

  myRooms: () => api.get('/rooms/my'),

  publicRooms: (search?: string) =>
    api.get('/rooms/public', { params: search ? { search } : {} }),

  online: (id: string) => api.get(`/rooms/${id}/online`),

  delete: (id: string) => api.delete(`/rooms/${id}`),

  transferHost: (roomId: string, newOwnerId: string) =>
    api.post('/rooms/transfer-host', { roomId, newOwnerId }),

  updatePermissions: (id: string, permissions: Record<string, 'host' | 'everyone'>) =>
    api.patch(`/rooms/${id}/permissions`, { permissions }),

  createInvite: (id: string, data: { ttlHours?: number; maxUses?: number }) =>
    api.post(`/rooms/${id}/invites`, data),
  listInvites: (id: string) => api.get(`/rooms/${id}/invites`),
  revokeInvite: (id: string, code: string) => api.delete(`/rooms/${id}/invites/${code}`),
};

export const invitesApi = {
  info: (code: string) => api.get(`/invites/${code}`),
  accept: (code: string) => api.post(`/invites/${code}/accept`),
};

export const messagesApi = {
  list: (roomId: string, options?: { before?: string; limit?: number }) =>
    api.get('/messages', { params: { roomId, ...options } }),

  send: (roomId: string, content: string) =>
    api.post('/messages', { roomId, content }),
};

export const uploadsApi = {
  initUpload: (contentType: string) =>
    api.post('/uploads/init', { contentType }),

  completeUpload: (data: { key: string; roomId: string; title?: string }) =>
    api.post('/uploads/complete', data),

  // Unificado: detecta automáticamente YouTube / Vimeo / HLS / MP4 en el backend.
  addUrl: (data: { roomId: string; url: string; title?: string }) =>
    api.post('/uploads/url', data),

  // Mantenidos por compatibilidad (delegan en /url).
  addYoutube: (data: { roomId: string; url: string; title?: string }) =>
    api.post('/uploads/url', data),

  addDirect: (data: { roomId: string; url: string; title?: string }) =>
    api.post('/uploads/url', data),

  deleteVideo: (videoId: string) =>
    api.delete(`/uploads/${videoId}`),
};
