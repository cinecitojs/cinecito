// apps/web/src/hooks/useVoiceChat.ts  — FASE 4
// Maneja las conexiones WebRTC peer-to-peer (mesh) para voz grupal

import { useRef, useState, useCallback, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { getSettings } from '../store/useSettings';
import { mediaErrorMessage } from '../lib/mediaErrors';

// Servidores STUN públicos (descubren la IP pública detrás del NAT)
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

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
  // Instancia viva del socket: se usa como dependencia del efecto de
  // señalización para (re)enganchar los listeners cuando el socket aparece/cambia.
  socketInstance?: Socket | null;
}

export function useVoiceChat({ socket, socketInstance }: UseVoiceChatOptions) {
  const [inVoice, setInVoice]       = useState(false);
  const [muted, setMuted]           = useState(false);
  const [videoOn, setVideoOn]       = useState(false);
  const [peers, setPeers]           = useState<Record<string, VoicePeer>>({});
  const [connecting, setConnecting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // roomId DINÁMICO: la llamada puede vivir a nivel de app y asociarse a la
  // sala en la que se inició. `callRoomId` es la sala activa de la llamada.
  const [callRoomId, setCallRoomId] = useState<string | null>(null);
  const roomIdRef = useRef<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnsRef   = useRef<Record<string, RTCPeerConnection>>({});
  const remoteStreams  = useRef<Record<string, MediaStream>>({});

  // ── Detección de "quién habla" (#7) vía Web Audio API ─────
  const [speaking, setSpeaking]   = useState<Record<string, boolean>>({}); // 'local' + socketIds
  const audioCtxRef   = useRef<AudioContext | null>(null);
  const analysersRef  = useRef<Record<string, AnalyserNode>>({});
  const rafRef        = useRef<number | null>(null);

  const startSpeakingLoop = useCallback(() => {
    if (rafRef.current != null) return;
    const buf = new Uint8Array(256);
    const tick = () => {
      const next: Record<string, boolean> = {};
      for (const [id, analyser] of Object.entries(analysersRef.current)) {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        next[id] = Math.sqrt(sum / buf.length) > 0.045; // umbral de voz
      }
      setSpeaking((prev) => {
        const ids = new Set([...Object.keys(prev), ...Object.keys(next)]);
        for (const id of ids) if ((prev[id] || false) !== (next[id] || false)) return next;
        return prev; // sin cambios → evita re-render
      });
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

  // ── Crear una conexión peer hacia un socket destino ───────
  const createPeerConnection = useCallback((targetSocketId: string, isInitiator: boolean) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Agregar las pistas locales (audio/video) a la conexión
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Cuando llega una pista remota, guardarla en el peer
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      remoteStreams.current[targetSocketId] = stream;
      attachAnalyser(targetSocketId, stream); // detección de habla del peer (#7)
      setPeers((prev) => ({
        ...prev,
        [targetSocketId]: { ...(prev[targetSocketId] || {} as VoicePeer), stream },
      }));
    };

    // Enviar candidatos ICE al peer destino vía socket
    pc.onicecandidate = (event) => {
      if (event.candidate && socket.current) {
        socket.current.emit('webrtc-ice-candidate', {
          targetId: targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        closePeer(targetSocketId);
      }
    };

    peerConnsRef.current[targetSocketId] = pc;

    // Si somos el iniciador, crear y enviar la oferta
    if (isInitiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer).then(() => offer))
        .then((offer) => {
          socket.current?.emit('webrtc-offer', { targetId: targetSocketId, offer, roomId: roomIdRef.current });
        })
        .catch(() => {});
    }

    return pc;
  }, [socket, attachAnalyser]);

  // ── Cerrar una conexión peer ──────────────────────────────
  const closePeer = useCallback((socketId: string) => {
    const pc = peerConnsRef.current[socketId];
    if (pc) {
      pc.close();
      delete peerConnsRef.current[socketId];
    }
    delete remoteStreams.current[socketId];
    setPeers((prev) => {
      const next = { ...prev };
      delete next[socketId];
      return next;
    });
  }, []);

  // ── Entrar al canal de voz ────────────────────────────────
  const joinVoice = useCallback(async (roomId: string, withVideo = false) => {
    if (inVoice || connecting) return;

    // CAUSA RAÍZ del fallo en móvil: getUserMedia solo existe en CONTEXTO SEGURO
    // (HTTPS o localhost). Por http://IP:puerto en el celular, navigator.mediaDevices
    // queda undefined → sin este guard fallaría en silencio. Avisamos con un mensaje claro.
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
      // Pedir acceso al micrófono (y cámara si withVideo), usando el dispositivo
      // preferido elegido en Configuración → Audio y video (si lo hay).
      const { micDeviceId, camDeviceId } = getSettings();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: micDeviceId ? { deviceId: { ideal: micDeviceId } } : true,
        video: withVideo ? (camDeviceId ? { deviceId: { ideal: camDeviceId } } : true) : false,
      });
      localStreamRef.current = stream;
      attachAnalyser('local', stream); // detección de habla propia (#7)
      setVideoOn(withVideo);

      // Avisar al servidor que entramos a voz, declarando el estado inicial de cámara
      // para que los demás nos vean con la cámara encendida desde el arranque.
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

        // Crear conexiones hacia los peers que ya estaban (somos iniciadores)
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
  // Usa solo refs (siempre actuales) → seguro de invocar desde el cleanup de
  // desmontaje sin depender de estado obsoleto. Garantiza que cámara/mic se
  // apaguen y los peers se cierren SIEMPRE (punto #2: sin dispositivos activos).
  const cleanupMedia = useCallback(() => {
    Object.values(peerConnsRef.current).forEach((pc) => { try { pc.close(); } catch { /* */ } });
    peerConnsRef.current = {};
    remoteStreams.current = {};
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => { try { t.stop(); } catch { /* */ } });
    }
    localStreamRef.current = null;

    // Tear-down del análisis de audio (#7) para no dejar recursos vivos.
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    analysersRef.current = {};
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch { /* */ } audioCtxRef.current = null; }
    setSpeaking({});
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
      audioTrack.enabled = muted; // si estaba muted, lo reactivamos
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
      // Ya hay video: simplemente toggle
      videoTrack.enabled = !videoOn;
      const newState = !videoOn;
      setVideoOn(newState);
      socket.current?.emit('voice-video-toggle', { roomId: roomIdRef.current, videoEnabled: newState });
    } else {
      // No hay pista de video: pedirla, agregarla a todas las conexiones y RENEGOCIAR.
      // Sin la renegociación (nueva oferta), el peer nunca recibe la pista nueva → la
      // cámara aparece "apagada" del otro lado aunque la tengamos encendida.
      try {
        const { camDeviceId } = getSettings();
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: camDeviceId ? { deviceId: { ideal: camDeviceId } } : true });
        const newTrack = videoStream.getVideoTracks()[0];
        stream.addTrack(newTrack);
        for (const [targetId, pc] of Object.entries(peerConnsRef.current)) {
          pc.addTrack(newTrack, stream);
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.current?.emit('webrtc-offer', { targetId, offer, roomId: roomIdRef.current });
          } catch { /* la renegociación de este peer falló; los demás siguen */ }
        }
        setVideoOn(true);
        socket.current?.emit('voice-video-toggle', { roomId: roomIdRef.current, videoEnabled: true });
      } catch (err) {
        setError(mediaErrorMessage(err, true));
      }
    }
  }, [videoOn, socket]);

  // ── Escuchar eventos de señalización del socket ───────────
  useEffect(() => {
    const s = socketInstance ?? socket.current;
    if (!s) return;

    // Alguien nuevo entró a voz → esperamos su oferta (somos receptores)
    const onUserJoined = ({ participant }: any) => {
      setPeers((prev) => ({ ...prev, [participant.socketId]: participant }));
    };

    // Alguien salió de voz → cerrar su conexión
    const onUserLeft = ({ socketId }: any) => {
      closePeer(socketId);
    };

    // Recibimos una oferta → crear respuesta.
    // REUTILIZAR la conexión existente si ya hay una (renegociación): crear una nueva
    // PC en cada oferta rompería la conexión y perdería las pistas ya negociadas.
    const onOffer = async ({ from, offer }: any) => {
      const pc = peerConnsRef.current[from] ?? createPeerConnection(from, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      s.emit('webrtc-answer', { targetId: from, answer });
    };

    // Recibimos una respuesta a nuestra oferta
    const onAnswer = async ({ from, answer }: any) => {
      const pc = peerConnsRef.current[from];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    // Recibimos un candidato ICE
    const onIceCandidate = async ({ from, candidate }: any) => {
      const pc = peerConnsRef.current[from];
      if (pc && candidate) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
        catch { /* ignorar candidatos tardíos */ }
      }
    };

    // Actualización de estado (mute/video) de un peer
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
  }, [socketInstance, socket, createPeerConnection, closePeer]);

  // ── Cleanup DEFINITIVO al desmontar / cambiar de sala ─────
  // Detiene cámara, micrófono y cierra todos los peers SIEMPRE, sin depender
  // de `inVoice` (que en este closure quedaría en su valor inicial = false →
  // era el bug que dejaba la cámara/mic encendidos al salir de la sala).
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
    joinVoice,
    leaveVoice,
    toggleMute,
    toggleVideo,
    localStream: localStreamRef,
  };
}
