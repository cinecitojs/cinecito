// apps/web/src/hooks/useVoiceChat.ts  — FASE 4 + motor de fluidez
// Conexiones WebRTC peer-to-peer (mesh) para voz/video grupal, con:
//   • adaptación dinámica de calidad de video según red/CPU (getStats + escalera)
//   • prioridad absoluta al audio (nunca se degrada)
//   • reconexión robusta por ICE restart ante caídas transitorias
//   • indicadores de calidad de red por peer y agregado
// El control fino (bitrate/escala/prioridad/ICE) vive en lib/callQuality.ts.

import { useRef, useState, useCallback, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { mediaErrorMessage } from '../lib/mediaErrors';
import { audioConstraints, videoConstraints } from '../lib/mediaConstraints';
import {
  pcConfig, prioritizeMedia, applyVideoLevel, hintMotion,
  samplePeer, decideLevel, levelToQuality, type NetQuality,
} from '../lib/callQuality';

export interface VoicePeer {
  socketId: string;
  userId: string | null;
  username: string;
  muted: boolean;
  videoEnabled: boolean;
  speaking?: boolean;
  stream?: MediaStream;
}

interface UseVoiceChatOptions {
  socket: React.MutableRefObject<Socket | null>;
  // Instancia viva del socket: dependencia del efecto de señalización para
  // (re)enganchar los listeners cuando el socket aparece/cambia.
  socketInstance?: Socket | null;
}

export function useVoiceChat({ socket, socketInstance }: UseVoiceChatOptions) {
  const [inVoice, setInVoice]       = useState(false);
  const [muted, setMuted]           = useState(false);
  const [videoOn, setVideoOn]       = useState(false);
  const [peers, setPeers]           = useState<Record<string, VoicePeer>>({});
  const [connecting, setConnecting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // Estado de red (para indicadores): agregado + por peer + "modo ahorro".
  const [netQuality, setNetQuality] = useState<NetQuality>('good');
  const [peerQuality, setPeerQuality] = useState<Record<string, NetQuality>>({});
  const [saving, setSaving]         = useState(false);

  const [callRoomId, setCallRoomId] = useState<string | null>(null);
  const roomIdRef = useRef<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnsRef   = useRef<Record<string, RTCPeerConnection>>({});
  const remoteStreams  = useRef<Record<string, MediaStream>>({});

  // Estado de adaptación por peer (nivel de la escalera + racha buena) y timers de
  // reconexión. Refs (no state) para no re-renderizar en cada ajuste.
  const adaptRef    = useRef<Record<string, { level: number; goodStreak: number }>>({});
  const reconnectTimersRef = useRef<Record<string, number>>({});

  // ── Detección de "quién habla" vía Web Audio API (throttle ~15Hz para CPU) ─────
  const [speaking, setSpeaking]   = useState<Record<string, boolean>>({});
  const audioCtxRef   = useRef<AudioContext | null>(null);
  const analysersRef  = useRef<Record<string, AnalyserNode>>({});
  const rafRef        = useRef<number | null>(null);
  const lastVadRef    = useRef(0);

  const startSpeakingLoop = useCallback(() => {
    if (rafRef.current != null) return;
    const buf = new Uint8Array(256);
    const tick = (ts: number) => {
      // Medir ~15 veces por segundo (no en cada frame) → menos CPU con varios peers.
      if (ts - lastVadRef.current >= 66) {
        lastVadRef.current = ts;
        const next: Record<string, boolean> = {};
        for (const [id, analyser] of Object.entries(analysersRef.current)) {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
          next[id] = Math.sqrt(sum / buf.length) > 0.045;
        }
        setSpeaking((prev) => {
          const ids = new Set([...Object.keys(prev), ...Object.keys(next)]);
          for (const id of ids) if ((prev[id] || false) !== (next[id] || false)) return next;
          return prev; // sin cambios → evita re-render
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const attachAnalyser = useCallback((id: string, stream: MediaStream) => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      if (!stream.getAudioTracks().length) return;
      const src = audioCtxRef.current.createMediaStreamSource(stream);
      const analyser = audioCtxRef.current.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      analysersRef.current[id] = analyser;
      startSpeakingLoop();
    } catch { /* AudioContext no disponible */ }
  }, [startSpeakingLoop]);

  // Aplica prioridad de audio + nivel de video actual a una conexión.
  const tunePeer = useCallback(async (socketId: string, pc: RTCPeerConnection) => {
    await prioritizeMedia(pc);
    const lvl = adaptRef.current[socketId]?.level ?? 0;
    await applyVideoLevel(pc, lvl);
  }, []);

  // Recuperación ante caída: renegociar con ICE restart (solo el iniciador para
  // evitar "glare" de ofertas cruzadas; el receptor responde con su onOffer).
  const restartIce = useCallback(async (targetId: string, pc: RTCPeerConnection) => {
    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      socket.current?.emit('webrtc-offer', { targetId, offer, roomId: roomIdRef.current });
    } catch { /* */ }
  }, [socket]);

  const clearReconnect = useCallback((socketId: string) => {
    const t = reconnectTimersRef.current[socketId];
    if (t) { clearTimeout(t); delete reconnectTimersRef.current[socketId]; }
  }, []);

  // ── Crear una conexión peer hacia un socket destino ───────
  const createPeerConnection = useCallback((targetSocketId: string, isInitiator: boolean) => {
    const pc = new RTCPeerConnection(pcConfig());
    (pc as any).__initiator = isInitiator;

    // Agregar pistas locales (audio/video) a la conexión.
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        if (track.kind === 'video') hintMotion(track); // favorece fluidez de movimiento
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      remoteStreams.current[targetSocketId] = stream;
      attachAnalyser(targetSocketId, stream);
      setPeers((prev) => ({
        ...prev,
        [targetSocketId]: { ...(prev[targetSocketId] || {} as VoicePeer), stream },
      }));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket.current) {
        socket.current.emit('webrtc-ice-candidate', { targetId: targetSocketId, candidate: event.candidate });
      }
    };

    // Reconexión robusta: 'disconnected' suele recuperarse solo → damos una gracia y,
    // si sigue mal, hacemos ICE restart. 'failed' → restart inmediato (iniciador).
    pc.onconnectionstatechange = () => {
      const cs = pc.connectionState;
      if (cs === 'connected') {
        clearReconnect(targetSocketId);
      } else if (cs === 'disconnected' || cs === 'failed') {
        if (!reconnectTimersRef.current[targetSocketId]) {
          reconnectTimersRef.current[targetSocketId] = window.setTimeout(() => {
            delete reconnectTimersRef.current[targetSocketId];
            const now = pc.connectionState;
            if (now === 'connected' || now === 'closed') return;
            if ((pc as any).__initiator) void restartIce(targetSocketId, pc);
            // Si tras el intento sigue caída un rato largo, la cerramos.
            reconnectTimersRef.current[targetSocketId] = window.setTimeout(() => {
              delete reconnectTimersRef.current[targetSocketId];
              if (pc.connectionState !== 'connected') closePeer(targetSocketId);
            }, 12_000);
          }, cs === 'failed' ? 600 : 4_000);
        }
      } else if (cs === 'closed') {
        closePeer(targetSocketId);
      }
    };

    peerConnsRef.current[targetSocketId] = pc;

    if (isInitiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer).then(() => offer))
        .then((offer) => {
          socket.current?.emit('webrtc-offer', { targetId: targetSocketId, offer, roomId: roomIdRef.current });
          void tunePeer(targetSocketId, pc);
        })
        .catch(() => {});
    }

    return pc;
    // closePeer es estable (useCallback []); se referencia en runtime sin recrear esta fn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, attachAnalyser, tunePeer, restartIce, clearReconnect]);

  // ── Cerrar una conexión peer ──────────────────────────────
  const closePeer = useCallback((socketId: string) => {
    clearReconnect(socketId);
    const pc = peerConnsRef.current[socketId];
    if (pc) { try { pc.close(); } catch { /* */ } delete peerConnsRef.current[socketId]; }
    delete remoteStreams.current[socketId];
    delete adaptRef.current[socketId];
    setPeers((prev) => { const next = { ...prev }; delete next[socketId]; return next; });
    setPeerQuality((prev) => { const next = { ...prev }; delete next[socketId]; return next; });
  }, [clearReconnect]);

  // ── Entrar al canal de voz ────────────────────────────────
  const joinVoice = useCallback(async (roomId: string, withVideo = false) => {
    if (inVoice || connecting) return;

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setError('La cámara y el micrófono necesitan una conexión segura (HTTPS). En el celular, entrá por una URL https://');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador no permite acceder a la cámara/micrófono en esta conexión.');
      return;
    }

    setConnecting(true);
    setError(null);
    roomIdRef.current = roomId;
    setCallRoomId(roomId);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints(),
        video: withVideo ? videoConstraints() : false,
      });
      localStreamRef.current = stream;
      hintMotion(stream.getVideoTracks()[0]);
      attachAnalyser('local', stream);
      setVideoOn(withVideo);

      socket.current?.emit('voice-join', { roomId, videoEnabled: withVideo, muted: false }, (res: any) => {
        if (res?.error) {
          setError(res.message || 'No se pudo unir a la llamada');
          stream.getTracks().forEach((t) => t.stop());
          localStreamRef.current = null;
          roomIdRef.current = null;
          setCallRoomId(null);
          setConnecting(false);
          return;
        }
        const existingPeers: VoicePeer[] = res.peers || [];
        const peerMap: Record<string, VoicePeer> = {};
        existingPeers.forEach((p) => {
          peerMap[p.socketId] = p;
          createPeerConnection(p.socketId, true);
        });
        setPeers(peerMap);
        setInVoice(true);
        setConnecting(false);
      });
    } catch (err: any) {
      setError(mediaErrorMessage(err, withVideo));
      roomIdRef.current = null;
      setCallRoomId(null);
      setConnecting(false);
    }
  }, [inVoice, connecting, socket, createPeerConnection, attachAnalyser]);

  // ── Limpieza INCONDICIONAL de media + WebRTC ──────────────
  const cleanupMedia = useCallback(() => {
    Object.keys(reconnectTimersRef.current).forEach((id) => clearTimeout(reconnectTimersRef.current[id]));
    reconnectTimersRef.current = {};
    Object.values(peerConnsRef.current).forEach((pc) => { try { pc.close(); } catch { /* */ } });
    peerConnsRef.current = {};
    remoteStreams.current = {};
    adaptRef.current = {};
    const stream = localStreamRef.current;
    if (stream) stream.getTracks().forEach((t) => { try { t.stop(); } catch { /* */ } });
    localStreamRef.current = null;

    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    analysersRef.current = {};
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch { /* */ } audioCtxRef.current = null; }
    setSpeaking({});
    setPeerQuality({});
    setNetQuality('good');
    setSaving(false);
  }, []);

  // ── Salir del canal de voz ────────────────────────────────
  const leaveVoice = useCallback(() => {
    if (roomIdRef.current) socket.current?.emit('voice-leave', { roomId: roomIdRef.current });
    cleanupMedia();
    setPeers({});
    setInVoice(false);
    setMuted(false);
    setVideoOn(false);
    setCallRoomId(null);
    roomIdRef.current = null;
  }, [socket, cleanupMedia]);

  // ── Mute / unmute micrófono ───────────────────────────────
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = muted;
      const newMuted = !muted;
      setMuted(newMuted);
      socket.current?.emit('voice-mute', { roomId: roomIdRef.current, muted: newMuted });
    }
  }, [muted, socket]);

  // ── Activar / desactivar cámara ───────────────────────────
  const toggleVideo = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];

    if (videoTrack) {
      videoTrack.enabled = !videoOn;
      const newState = !videoOn;
      setVideoOn(newState);
      socket.current?.emit('voice-video-toggle', { roomId: roomIdRef.current, videoEnabled: newState });
    } else {
      // Sin pista de video: pedirla, agregarla a cada conexión y RENEGOCIAR.
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints() });
        const newTrack = videoStream.getVideoTracks()[0];
        hintMotion(newTrack);
        stream.addTrack(newTrack);
        for (const [targetId, pc] of Object.entries(peerConnsRef.current)) {
          pc.addTrack(newTrack, stream);
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.current?.emit('webrtc-offer', { targetId, offer, roomId: roomIdRef.current });
            void tunePeer(targetId, pc); // prioridad de audio + nivel de video al nuevo sender
          } catch { /* la renegociación de este peer falló; los demás siguen */ }
        }
        setVideoOn(true);
        socket.current?.emit('voice-video-toggle', { roomId: roomIdRef.current, videoEnabled: true });
      } catch (err) {
        setError(mediaErrorMessage(err, true));
      }
    }
  }, [videoOn, socket, tunePeer]);

  // ── Adaptación dinámica: monitor de red cada 3s mientras hay llamada ───────────
  useEffect(() => {
    if (!inVoice) return;
    const id = window.setInterval(async () => {
      const entries = Object.entries(peerConnsRef.current);
      if (entries.length === 0) return;
      const q: Record<string, NetQuality> = {};
      let anyReconnecting = false, anySaving = false, worst = 0;

      for (const [sid, pc] of entries) {
        const cs = pc.connectionState;
        if (cs === 'disconnected' || cs === 'failed' || cs === 'connecting' || cs === 'new') {
          q[sid] = 'reconnecting'; anyReconnecting = true; continue;
        }
        if (cs !== 'connected') continue;
        const st = adaptRef.current[sid] ?? { level: 0, goodStreak: 0 };
        const sample = await samplePeer(pc);
        const dec = decideLevel(sample, st.level, st.goodStreak);
        adaptRef.current[sid] = dec;
        if (dec.level !== st.level) await applyVideoLevel(pc, dec.level);
        if (dec.level >= 2) anySaving = true;
        worst = Math.max(worst, dec.level);
        q[sid] = levelToQuality(dec.level);
      }

      setPeerQuality((prev) => {
        const keys = new Set([...Object.keys(prev), ...Object.keys(q)]);
        for (const k of keys) if (prev[k] !== q[k]) return q;
        return prev;
      });
      setSaving(anySaving);
      setNetQuality(anyReconnecting ? 'reconnecting' : worst <= 1 ? 'good' : worst === 2 ? 'medium' : 'poor');
    }, 3_000);
    return () => clearInterval(id);
  }, [inVoice]);

  // ── Escuchar eventos de señalización del socket ───────────
  useEffect(() => {
    const s = socketInstance ?? socket.current;
    if (!s) return;

    const onUserJoined = ({ participant }: any) => {
      setPeers((prev) => ({ ...prev, [participant.socketId]: participant }));
    };
    const onUserLeft = ({ socketId }: any) => closePeer(socketId);

    // Oferta → respuesta. Reutiliza la PC existente (renegociación / ICE restart):
    // crear una nueva en cada oferta rompería la conexión y perdería las pistas.
    const onOffer = async ({ from, offer }: any) => {
      const pc = peerConnsRef.current[from] ?? createPeerConnection(from, false);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        s.emit('webrtc-answer', { targetId: from, answer });
        void tunePeer(from, pc);
      } catch { /* colisión de renegociación; el monitor/ICE se recuperan */ }
    };
    const onAnswer = async ({ from, answer }: any) => {
      const pc = peerConnsRef.current[from];
      if (pc) { try { await pc.setRemoteDescription(new RTCSessionDescription(answer)); } catch { /* */ } }
    };
    const onIceCandidate = async ({ from, candidate }: any) => {
      const pc = peerConnsRef.current[from];
      if (pc && candidate) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* candidato tardío */ }
      }
    };
    const onStateUpdate = ({ socketId, muted, videoEnabled }: any) => {
      setPeers((prev) => prev[socketId]
        ? { ...prev, [socketId]: { ...prev[socketId], muted, videoEnabled } }
        : prev);
    };

    s.on('voice-user-joined',    onUserJoined);
    s.on('voice-user-left',      onUserLeft);
    s.on('webrtc-offer',         onOffer);
    s.on('webrtc-answer',        onAnswer);
    s.on('webrtc-ice-candidate', onIceCandidate);
    s.on('voice-state-update',   onStateUpdate);

    return () => {
      s.off('voice-user-joined',    onUserJoined);
      s.off('voice-user-left',      onUserLeft);
      s.off('webrtc-offer',         onOffer);
      s.off('webrtc-answer',        onAnswer);
      s.off('webrtc-ice-candidate', onIceCandidate);
      s.off('voice-state-update',   onStateUpdate);
    };
  }, [socketInstance, socket, createPeerConnection, closePeer, tunePeer]);

  // ── Cleanup DEFINITIVO al desmontar / cambiar de sala ─────
  useEffect(() => () => {
    try { if (roomIdRef.current) socket.current?.emit('voice-leave', { roomId: roomIdRef.current }); } catch { /* */ }
    cleanupMedia();
  }, [socket, cleanupMedia]);

  return {
    inVoice,
    muted,
    videoOn,
    peers,
    speaking,
    connecting,
    error,
    callRoomId,
    netQuality,
    peerQuality,
    saving,
    joinVoice,
    leaveVoice,
    toggleMute,
    toggleVideo,
    localStream: localStreamRef,
  };
}
