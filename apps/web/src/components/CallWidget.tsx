// apps/web/src/components/CallWidget.tsx
// Mini-Call PiP persistente: cuando hay una llamada activa y NO estás viendo su
// sala, la llamada flota como widget arrastrable (cámaras/avatares + controles)
// y te sigue por cualquier ruta de la app. La llamada vive en CallProvider.

import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, PhoneOff, LogIn } from 'lucide-react';
import { useCall } from '../providers/CallProvider';
import { useAuthStore } from '../store/useAuthStore';
import { Avatar } from './ui';
import FloatingWidget from './FloatingWidget';
import { usePageVisible } from '../hooks/usePageVisible';

const Tile = React.memo(function Tile({ name, stream, videoOn, muted, speaking }: {
  name: string; stream?: MediaStream | null; videoOn?: boolean; muted?: boolean; speaking?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const visible = usePageVisible();
  // Pausa el decode cuando la pestaña está oculta (el audio sigue por CallAudioSink).
  useEffect(() => { if (ref.current) ref.current.srcObject = stream && visible ? stream : null; }, [stream, visible]);
  return (
    <div className={`relative aspect-square rounded-xl bg-[var(--surface-2)] dark:bg-dark-surface2 overflow-hidden flex items-center justify-center transition-shadow
      ${speaking && !muted ? 'ring-2 ring-online ring-offset-1 ring-offset-surface dark:ring-offset-dark-surface' : ''}`}>
      {videoOn && stream
        ? <video ref={ref} autoPlay playsInline muted className="w-full h-full object-cover" />
        : <Avatar name={name} size="sm" />}
      {muted && (
        <span className="absolute bottom-1 right-1 bg-red-500 text-white p-0.5 rounded-full">
          <MicOff className="w-2.5 h-2.5" />
        </span>
      )}
    </div>
  );
});

export default function CallWidget() {
  const call = useCall();
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  if (!call.inVoice || !call.callRoomId) return null;
  // En la propia sala de la llamada, el widget de la sala ya muestra todo.
  if (location.pathname === `/room/${call.callRoomId}`) return null;

  const peers = Object.values(call.peers);

  return (
    <FloatingWidget
      id="minicall"
      title={`Llamada · ${peers.length + 1}`}
      width={236} bodyHeight={260} centerBody
      sizePresets={[{ w: 200, h: 210 }, { w: 264, h: 300 }, { w: 340, h: 400 }]}
      accentClass="border-secondary/40 glow-primary"
      icon={<span className="online-dot w-2.5 h-2.5 shrink-0" />}
      defaultPos={{ x: 16, y: Math.max(72, (typeof window !== 'undefined' ? window.innerHeight : 800) - 300) }}
      headerExtra={
        <button onClick={() => navigate(`/room/${call.callRoomId}`)} title="Volver a la sala" aria-label="Volver a la sala"
          className="p-1 rounded-lg hover:bg-primary/15 text-primary transition-colors">
          <LogIn className="w-3.5 h-3.5" />
        </button>
      }
    >
      <div className="p-2.5 w-full">
        {call.saving && (
          <p className="text-[10px] text-amber-500 text-center mb-1.5">Video reducido · audio estable</p>
        )}
        <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto">
          <Tile name={user?.username || 'Vos'} stream={call.localStream.current}
            videoOn={call.videoOn} muted={call.muted} speaking={call.speaking['local']} />
          {peers.map((p) => (
            <Tile key={p.socketId} name={p.username} stream={p.stream}
              videoOn={p.videoEnabled} muted={p.muted} speaking={call.speaking[p.socketId]} />
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 mt-2.5">
          <button onClick={call.toggleMute} title={call.muted ? 'Activar micrófono' : 'Silenciar'} aria-label={call.muted ? 'Activar micrófono' : 'Silenciar'}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${call.muted ? 'bg-red-500 text-white' : 'bg-[var(--surface-2)] dark:bg-dark-surface2 hover:bg-primary/10'}`}>
            {call.muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button onClick={call.toggleVideo} title={call.videoOn ? 'Apagar cámara' : 'Encender cámara'} aria-label={call.videoOn ? 'Apagar cámara' : 'Encender cámara'}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${call.videoOn ? 'bg-primary text-white' : 'bg-[var(--surface-2)] dark:bg-dark-surface2 hover:bg-primary/10'}`}>
            {call.videoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>
          <button onClick={call.leaveVoice} title="Colgar" aria-label="Colgar"
            className="w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all">
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      </div>
    </FloatingWidget>
  );
}
