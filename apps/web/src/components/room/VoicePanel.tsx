// apps/web/src/components/room/VoicePanel.tsx  — FASE 4
// Panel de llamada de voz/video con controles

import React, { useRef, useEffect, useState } from 'react';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Phone, Loader2, Volume2,
} from 'lucide-react';
import { Avatar } from '../ui';
import CallLobby from './CallLobby';
import type { VoicePeer } from '../../hooks/useVoiceChat';
import type { NetQuality } from '../../lib/callQuality';

// Punto de calidad de red: verde (bien) · ámbar (media/reconectando) · rojo (mala).
const QUALITY_UI: Record<NetQuality, { color: string; label: string; pulse?: boolean }> = {
  good:         { color: 'bg-[var(--online,#34C77B)]', label: 'Conexión estable' },
  medium:       { color: 'bg-amber-500', label: 'Conexión media — bajamos un poco el video' },
  poor:         { color: 'bg-red-500',   label: 'Conexión débil — video al mínimo para no cortar' },
  reconnecting: { color: 'bg-amber-500', label: 'Reconectando…', pulse: true },
};
function QualityDot({ q, className = '' }: { q?: NetQuality; className?: string }) {
  if (!q) return null;
  const ui = QUALITY_UI[q];
  return <span title={ui.label} aria-label={ui.label}
    className={`inline-block w-2.5 h-2.5 rounded-full ${ui.color} ${ui.pulse ? 'animate-pulse' : ''} ${className}`} />;
}

// ── Video de un peer (si tiene cámara activa) ────────────────
// El AUDIO se reproduce en el sink global (CallAudioSink) para que siga
// sonando al salir de la sala; acá el video va SILENCIADO (evita audio doble).
function PeerVideo({ stream, name }: { stream?: MediaStream; name: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  return (
    <video
      ref={videoRef}
      autoPlay playsInline muted
      className="w-full h-full object-cover rounded-2xl"
      aria-label={`Video de ${name}`}
    />
  );
}

interface VoicePanelProps {
  inVoice: boolean;
  muted: boolean;
  videoOn: boolean;
  connecting: boolean;
  error: string | null;
  peers: Record<string, VoicePeer>;
  speaking?: Record<string, boolean>;
  currentUsername: string;
  localStream: React.MutableRefObject<MediaStream | null>;
  netQuality?: NetQuality;
  peerQuality?: Record<string, NetQuality>;
  saving?: boolean;
  onJoin: (withVideo?: boolean) => void;
  onLeave: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

export default function VoicePanel({
  inVoice, muted, videoOn, connecting, error, peers, speaking,
  currentUsername, localStream, netQuality, peerQuality, saving,
  onJoin, onLeave, onToggleMute, onToggleVideo,
}: VoicePanelProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [lobbyOpen, setLobbyOpen]   = useState(false);
  const [lobbyVideo, setLobbyVideo] = useState(false);

  // Mostrar el video local propio
  useEffect(() => {
    if (localVideoRef.current && localStream.current && videoOn) {
      localVideoRef.current.srcObject = localStream.current;
    }
  }, [videoOn, inVoice, localStream]);

  const peerList = Object.values(peers);
  const totalInCall = peerList.length + (inVoice ? 1 : 0);

  // ── No está en la llamada: botón para unirse ──────────────
  if (!inVoice) {
    return (
      <>
      <CallLobby
        open={lobbyOpen} startWithVideo={lobbyVideo} username={currentUsername}
        onClose={() => setLobbyOpen(false)}
        onConfirm={(withVideo) => { setLobbyOpen(false); onJoin(withVideo); }}
      />
      <div className="bg-surface dark:bg-dark-surface rounded-3xl border border-[var(--border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm">Voz</span>
          {peerList.length > 0 && (
            <span className="ml-auto text-xs text-[var(--text-muted)]">
              {peerList.length} en llamada
            </span>
          )}
        </div>
        <div className="p-4 flex flex-col items-center gap-3">
          {/* Avatares de quienes ya están en la llamada */}
          {peerList.length > 0 && (
            <div className="flex -space-x-2">
              {peerList.slice(0, 5).map((p) => (
                <Avatar key={p.socketId} name={p.username} size="sm"
                  className="ring-2 ring-surface dark:ring-dark-surface" />
              ))}
            </div>
          )}
          <p className="text-xs text-[var(--text-muted)] text-center">
            {peerList.length > 0
              ? 'Unite a la conversación de voz'
              : 'Sé el primero en iniciar una llamada'}
          </p>
          <div className="flex gap-2 w-full">
            <button
              onClick={() => { setLobbyVideo(false); setLobbyOpen(true); }}
              disabled={connecting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-primary-dark transition-all disabled:opacity-50"
            >
              {connecting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><Phone className="w-4 h-4" /> Unirse</>}
            </button>
            <button
              onClick={() => { setLobbyVideo(true); setLobbyOpen(true); }}
              disabled={connecting}
              className="px-3 py-2.5 rounded-2xl border-2 border-[var(--border)] hover:border-primary transition-all disabled:opacity-50"
              title="Unirse con cámara"
            >
              <Video className="w-4 h-4" />
            </button>
          </div>
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        </div>
      </div>
      </>
    );
  }

  // ── En la llamada: panel activo ───────────────────────────
  return (
    <div className="bg-surface dark:bg-dark-surface rounded-3xl border border-primary/30 overflow-hidden shadow-cine-sm">
      <div className="px-4 py-2.5 border-b border-[var(--border)] bg-primary/5">
        <div className="flex items-center gap-2">
          <span className="online-dot w-2.5 h-2.5" />
          <span className="font-bold text-sm">En llamada</span>
          <QualityDot q={netQuality} className="ml-1" />
          <span className="ml-auto text-xs text-[var(--text-muted)]">{totalInCall} conectados</span>
        </div>
        {saving && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
            Bajamos la calidad del video para mantener la llamada fluida. El audio sigue intacto.
          </p>
        )}
        {netQuality === 'reconnecting' && (
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Reconectando con algún participante…</p>
        )}
      </div>

      {/* Participantes */}
      <div className="p-3 grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">
        {/* Yo (local) */}
        <div className={`relative aspect-square rounded-2xl bg-[var(--surface-2)] dark:bg-dark-surface2 overflow-hidden flex items-center justify-center transition-shadow
          ${speaking?.['local'] && !muted ? 'ring-2 ring-online ring-offset-1 ring-offset-surface dark:ring-offset-dark-surface' : ''}`}>
          {videoOn ? (
            <video ref={localVideoRef} autoPlay playsInline muted
              className="w-full h-full object-cover" />
          ) : (
            <Avatar name={currentUsername} size="lg" />
          )}
          <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold bg-black/50 text-white px-2 py-0.5 rounded-full truncate">
              Vos
            </span>
            {muted && (
              <span className="bg-red-500 text-white p-1 rounded-full">
                <MicOff className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>

        {/* Peers remotos */}
        {peerList.map((peer) => (
          <div key={peer.socketId}
            className={`relative aspect-square rounded-2xl bg-[var(--surface-2)] dark:bg-dark-surface2 overflow-hidden flex items-center justify-center transition-shadow
              ${speaking?.[peer.socketId] && !peer.muted ? 'ring-2 ring-online ring-offset-1 ring-offset-surface dark:ring-offset-dark-surface' : ''}`}>
            {peer.videoEnabled && peer.stream ? (
              <PeerVideo stream={peer.stream} name={peer.username} />
            ) : (
              <Avatar name={peer.username} size="lg" />
            )}
            <QualityDot q={peerQuality?.[peer.socketId]} className="absolute top-1.5 right-1.5 ring-2 ring-black/20" />
            <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold bg-black/50 text-white px-2 py-0.5 rounded-full truncate max-w-[70%]">
                {peer.username}
              </span>
              {peer.muted && (
                <span className="bg-red-500 text-white p-1 rounded-full">
                  <MicOff className="w-3 h-3" />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Controles */}
      <div className="p-3 border-t border-[var(--border)] flex items-center justify-center gap-2">
        <button
          onClick={onToggleMute}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
            muted
              ? 'bg-red-500 text-white'
              : 'bg-[var(--surface-2)] dark:bg-dark-surface2 hover:bg-primary/10'
          }`}
          title={muted ? 'Activar micrófono' : 'Silenciar'}
        >
          {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          onClick={onToggleVideo}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
            videoOn
              ? 'bg-primary text-white'
              : 'bg-[var(--surface-2)] dark:bg-dark-surface2 hover:bg-primary/10'
          }`}
          title={videoOn ? 'Apagar cámara' : 'Encender cámara'}
        >
          {videoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        <button
          onClick={onLeave}
          className="w-11 h-11 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all"
          title="Salir de la llamada"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>

      {error && <p className="text-xs text-red-500 text-center pb-3">{error}</p>}
    </div>
  );
}
