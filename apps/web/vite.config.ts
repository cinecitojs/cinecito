import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // host: true → escucha en 0.0.0.0 para acceso multi-dispositivo por LAN.
  server: { host: true, port: 5173 },
});
