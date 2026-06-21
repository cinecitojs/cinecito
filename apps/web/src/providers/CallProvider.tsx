// apps/web/src/providers/CallProvider.tsx
// La llamada de voz/video vive a NIVEL DE APP (no dentro de Room), con un socket
// DEDICADO (aislado del socket de chat/sync de la sala). Así la llamada sobrevive
// al salir de la sala: el usuario puede "salir y mantener la llamada" (#1 opción 2),
// y un widget flotante la muestra mientras navega.

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';
import { useVoiceChat } from '../hooks/useVoiceChat';
import { SERVER_URL } from '../lib/serverUrl';

const SOCKET_URL = SERVER_URL;

type CallApi = ReturnType<typeof useVoiceChat>;
const CallContext = createContext<CallApi | null>(null);

export function useCall(): CallApi {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall debe usarse dentro de <CallProvider>');
  return ctx;
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);

  // Socket dedicado de la llamada: se crea/recrea según el token de sesión.
  useEffect(() => {
    if (!token) return;
    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = s;
    setSocketInstance(s);
    return () => {
      try { s.disconnect(); } catch { /* */ }
      socketRef.current = null;
      setSocketInstance(null);
    };
  }, [token]);

  const call = useVoiceChat({ socket: socketRef, socketInstance });

  return <CallContext.Provider value={call}>{children}</CallContext.Provider>;
}
