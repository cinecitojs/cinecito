// apps/web/src/components/CallAudioSink.tsx
// Reproduce el AUDIO de los peers a nivel de app (siempre que haya llamada),
// para que siga sonando aunque salgas de la sala. Es la ÚNICA fuente de audio
// remoto (los <video> en VoicePanel van silenciados → sin audio duplicado).

import React, { useEffect, useRef } from 'react';
import { useCall } from '../providers/CallProvider';

function Sink({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = stream; }, [stream]);
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
