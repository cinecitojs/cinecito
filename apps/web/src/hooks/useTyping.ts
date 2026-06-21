// apps/web/src/hooks/useTyping.ts  — FASE 3
// Maneja el debounce del indicador "X está escribiendo"

import { useRef, useCallback } from 'react';

interface UseTypingOptions {
  roomId: string;
  onStartTyping: (roomId: string) => void;
  onStopTyping:  (roomId: string) => void;
  delay?: number; // ms de inactividad antes de emitir stop (default: 2000)
}

export function useTyping({ roomId, onStartTyping, onStopTyping, delay = 2000 }: UseTypingOptions) {
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const handleInput = useCallback(() => {
    // Si no estaba escribiendo, emitir start
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onStartTyping(roomId);
    }

    // Reiniciar el timer de stop
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onStopTyping(roomId);
    }, delay);
  }, [roomId, onStartTyping, onStopTyping, delay]);

  const handleSend = useCallback(() => {
    // Al enviar, limpiar inmediatamente
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onStopTyping(roomId);
    }
  }, [roomId, onStopTyping]);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onStopTyping(roomId);
    }
  }, [roomId, onStopTyping]);

  return { handleInput, handleSend, cleanup };
}
