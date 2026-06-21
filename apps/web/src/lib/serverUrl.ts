// apps/web/src/lib/serverUrl.ts
// URL del backend (HTTP + Socket.IO).
// Si VITE_API_URL no está definida, se usa el MISMO host desde el que se abrió la web.
// Así, abriendo http://192.168.x.x:5173 en el celular/tablet, las llamadas van a
// http://192.168.x.x:4000 (la PC), sin hardcodear la IP local.
export const SERVER_URL =
  (import.meta.env.VITE_API_URL as string) ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : 'http://localhost:4000');
