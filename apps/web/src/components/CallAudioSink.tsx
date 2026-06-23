// apps/web/src/components/CallAudioSink.tsx
// Reproduce el AUDIO de los peers a nivel de app (siempre que haya llamada),
// para que siga sonando aunque salgas de la sala. Es la ÚNICA fuente de audio
// remoto (los <video> en VoicePanel van silenciados → sin audio duplicado).
//
// 🔊 Bug crítico en móvil (fix): al iniciar un video (el <video> nativo o el
// iframe de YouTube/Vimeo), el SO le da el "foco de audio" y PAUSA estos
// <audio> de fondo → la llamada deja de escucharse y nadie la reanuda. Por eso
// pasa en celular y no en PC (móvil usa una sesión de audio exclusiva).
// Solución: auto-reparación — reanudar ante `pause`, al volver la pestaña, y con
// un heartbeat liviano que cubre el caso del iframe (no emite `pause` accesible).
// Solo actúa si el elemento quedó pausado → en desktop es un no-op total.

import React, { useEffect, useRef } from 'react';
import { useCall } from '../providers/CallProvider';

function Sink({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;

    // Reclama la reproducción solo si el SO lo pausó (no pelea con un elemento
    // que ya está sonando → no puede interferir con el video en coexistencia).
    let alive = true;
    const resume = () => {
      if (!alive || !el.srcObject || !el.paused) return;
      el.play().catch(() => { /* esperando gesto/llega el heartbeat */ });
    };

    // Recuperación inmediata cuando el SO lo interrumpe.
    el.addEventListener('pause', resume);
    // Al volver a la pestaña (cambiar de app / desbloquear el cel).
    document.addEventListener('visibilitychange', resume);
    // Heartbeat: único camino para el caso del iframe (YouTube/Vimeo no nos dan
    // un evento de play). Barato: 1 timer por peer (máx 4) y solo si está pausado.
    const hb = window.setInterval(resume, 1500);

    resume(); // primer intento

    return () => {
      alive = false;
      el.removeEventListener('pause', resume);
      document.removeEventListener('visibilitychange', resume);
      clearInterval(hb);
    };
  }, [stream]);

  return <audio ref={ref} autoPlay playsInline />;
}

export default function CallAudioSink() {
  const call = useCall();
  if (!call.inVoice) return null;
  return (
    <div aria-hidden style={{ display: 'none' }}>
      {Object.values(call.peers)
        .filter((p) => p.stream)
        .map((p) => <Sink key={p.socketId} stream={p.stream!} />)}
    </div>
  );
}
