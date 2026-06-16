import { io, Socket } from 'socket.io-client';
import { useEffect, useRef } from 'react';

export function useSocket(token?: string) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const url = (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000';
    const s = io(url, { auth: { token } });
    socketRef.current = s;
    return () => {
      s.close();
    };
  }, [token]);

  return socketRef;
}
