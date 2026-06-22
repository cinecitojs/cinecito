// apps/web/src/main.tsx  — FASE 1A
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './app/App';
import './styles/index.css';

// Monitoreo de errores: solo en producción y solo si hay DSN. La carga es dinámica,
// así que en desarrollo (o sin DSN) @sentry/react ni siquiera entra al bundle.
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  import('./lib/sentry').then((m) => m.initSentry()).catch(() => { /* no-op */ });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
