// apps/web/src/components/room/VoicePanel.tsx  — FASE 4
// Panel de llamada de voz/video con controles

import React, { useRef, useEffect, useState } from 'react';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Phone, Loader2, Volume2, Activity,
} from 'lucide-react';
import { Avatar } from '../ui';
import CallLobby from './CallLobby';
import type { VoicePeer, PeerStat } from '../../hooks/useVoiceChat';
import type { NetQuality } from '../../lib/callQuality';
import { usePageVisible } from '../../hooks/usePageVisible';

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
const PeerVideo = React.memo(function PeerVideo({ stream, name }: { stream?: MediaStream; name: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const visible = usePageVisible();
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    // Pausa el DECODE del video cuando la pestaña está oculta (ahorra CPU/batería).
    // El audio NO se ve afectado: se reproduce aparte en CallAudioSink.
    el.srcObject = stream && visible ? stream : null;
  }, [stream, visible]);
  return (
    <video
      ref={videoRef}
      autoPlay playsInline muted
      className="w-full h-full object-cover rounded-2xl"
      aria-label={`Video de ${name}`}
    />
  );
});

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
  peerStats?: Record<string, PeerStat>;
  saving?: boolean;
  // Capacidad de activos (videollamada). Fuente: servidor.
  activeCount?: number;
  maxActive?: number;
  roomFull?: boolean;
  isWaiting?: boolean;
  onJoin: (withVideo?: boolean) => void;
  onLeave: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onRequestSlot?: () => void;
  onCancelSlot?: () => void;
}

export default function VoicePanel({
  inVoice, muted, videoOn, connecting, error, peers, speaking,
  currentUsername, localStream, netQuality, peerQuality, peerStats, saving,
  activeCount = 0, maxActive = 4, roomFull = false, isWaiting = false,
  onJoin, onLeave, onToggleMute, onToggleVideo, onRequestSlot, onCancelSlot,
}: VoicePanelProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [lobbyOpen, setLobbyOpen]   = useState(false);
  const [lobbyVideo, setLobbyVideo] = useState(false);
  const [showStats, setShowStats]   = useState(false);

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
          {/* Contador de activos visible para todos (también espectadores) */}
          <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${roomFull ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-primary/10 text-primary'}`}>
            Activos: {activeCount}/{maxActive}
          </span>
        </div>
        <div className="p-4 flex flex-col items-center gap-3">
          {roomFull ? (
            // ── Sala llena: no hay cupo activo → espectador / espera ──
            <>
              <p className="text-xs text-[var(--text-muted)] text-center">
                La sala alcanzó el máximo de {maxActive} participantes activos. Podés seguir
                <span className="font-semibold text-[var(--text)]"> viendo y chateando</span> como espectador.
              </p>
              {isWaiting ? (
                <button onClick={onCancelSlot}
                  className="w-full py-2.5 rounded-2xl border-2 border-amber-500/50 text-amber-600 dark:text-amber-400 font-bold text-sm hover:bg-amber-500/10 transition-all">
                  En espera ✓ · Cancelar aviso
                </button>
              ) : (
                <button onClick={onRequestSlot}
                  className="w-full py-2.5 rounded-2xl border-2 border-[var(--border)] hover:border-primary font-bold text-sm transition-all">
                  Avisarme cuando se libere un lugar
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-[var(--text-muted)] text-center">
                {activeCount > 0 ? 'Unite a la conversación' : 'Sé el primero en iniciar una llamada'}
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
            </>
          )}
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
          <button onClick={() => setShowStats((v) => !v)} title="Estado de red (diagnóstico)" aria-label="Estado de red"
            className={`p-1 rounded-lg transition-colors ${showStats ? 'text-primary bg-primary/10' : 'text-[var(--text-muted)] hover:text-primary'}`}>
            <Activity className="w-3.5 h-3.5" />
          </button>
        </div>
        {saving && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
            Bajamos la calidad del video para mantener la llamada fluida. El audio sigue intacto.
          </p>
        )}
        {netQuality === 'reconnecting' && (
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Reconectando con algún participante…</p>
        )}
        {showStats && (
          <div className="mt-2 rounded-xl bg-[var(--surface-2)]/60 dark:bg-dark-surface2/60 p-2 space-y-1">
            {peerList.length === 0 && <p className="text-[11px] text-[var(--text-muted)]">Sin pares conectados aún.</p>}
            {peerList.map((p) => {
              const s = peerStats?.[p.socketId];
              const ladder = ['Alta', 'Alta', 'Media', 'Baja'];
              return (
                <div key={p.socketId} className="flex items-center gap-2 text-[11px]">
                  <QualityDot q={peerQuality?.[p.socketId]} />
                  <span className="font-semibold truncate max-w-[5rem]">{p.username}</span>
                  <span className="ml-auto tabular-nums text-[var(--text-muted)]">
                    {s ? `${s.rttMs}ms · ${(s.lossPct * 100).toFixed(0)}% pérdida · ${ladder[s.level] ?? '—'} · ${s.ice}` : '—'}
                  </span>
                </div>
              );
            })}
            <p className="text-[10px] text-[var(--text-muted)] pt-1">RTT · pérdida de paquetes · calidad de video · estado ICE</p>
          </div>
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
