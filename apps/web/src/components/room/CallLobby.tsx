// apps/web/src/components/room/CallLobby.tsx
// Pantalla previa (lobby) de la llamada: detecta contexto seguro, pide permisos
// EXPLÍCITAMENTE con un gesto del usuario, muestra preview de cámara + nivel de
// micrófono y estado de cada dispositivo. Recién entonces permite entrar.
// Resuelve P1: en móvil sin HTTPS, getUserMedia no existe → acá se explica claro.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Phone, ShieldAlert, Loader2, Camera } from 'lucide-react';
import { Modal, Button } from '../ui';
import { getSettings } from '../../store/useSettings';

type Phase = 'checking' | 'blocked' | 'denied' | 'error' | 'ready';

interface CallLobbyProps {
  open: boolean;
  startWithVideo?: boolean;
  username: string;
  onClose: () => void;
  onConfirm: (withVideo: boolean) => void;
}

export default function CallLobby({ open, startWithVideo = false, username, onClose, onConfirm }: CallLobbyProps) {
  const [phase, setPhase]   = useState<Phase>('checking');
  const [camOn, setCamOn]   = useState(startWithVideo);
  const [micOk, setMicOk]   = useState(false);
  const [level, setLevel]   = useState(0); // nivel de micrófono 0..1
  const [errMsg, setErrMsg] = useState('');

  const streamRef   = useRef<MediaStream | null>(null);
  const videoRef    = useRef<HTMLVideoElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef      = useRef<number | null>(null);

  const stopMeter = useCallback(() => {
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch { /* */ } audioCtxRef.current = null; }
  }, []);

  const stopStream = useCallback(() => {
    stopMeter();
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => { try { t.stop(); } catch { /* */ } }); }
    streamRef.current = null;
    setLevel(0); setMicOk(false);
  }, [stopMeter]);

  const attachMeter = useCallback((stream: MediaStream) => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx || !stream.getAudioTracks().length) return;
      const ctx = new Ctx(); audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser(); analyser.fftSize = 512;
      src.connect(analyser);
      const buf = new Uint8Array(256);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
        rafRef.current = requestAnimationFrame(tick);
      };
      setMicOk(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch { /* sin medidor */ }
  }, []);

  // Pedir (o re-pedir) dispositivos con un gesto del usuario.
  const requestDevices = useCallback(async (withVideo: boolean) => {
    setPhase('checking'); setErrMsg('');
    stopStream();
    try {
      const { micDeviceId, camDeviceId } = getSettings();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: micDeviceId ? { deviceId: { ideal: micDeviceId } } : true,
        video: withVideo ? (camDeviceId ? { deviceId: { ideal: camDeviceId } } : true) : false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = withVideo ? stream : null;
      attachMeter(stream);
      setPhase('ready');
    } catch (e: any) {
      if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') setPhase('denied');
      else { setErrMsg(e?.message || 'No se pudo acceder a los dispositivos'); setPhase('error'); }
    }
  }, [attachMeter, stopStream]);

  // Al abrir: detectar contexto seguro y arrancar el flujo.
  useEffect(() => {
    if (!open) return;
    setCamOn(startWithVideo);
    if (typeof window !== 'undefined' && !window.isSecureContext) { setPhase('blocked'); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setPhase('blocked'); return; }
    requestDevices(startWithVideo);
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggleCam = () => {
    const next = !camOn;
    setCamOn(next);
    if (phase === 'ready' || phase === 'checking') requestDevices(next);
  };

  const confirm = () => { stopStream(); onConfirm(camOn); };
  const close   = () => { stopStream(); onClose(); };

  return (
    <Modal open={open} onClose={close} title="Preparate para entrar">
      {phase === 'blocked' ? (
        <div className="text-center space-y-3 py-2">
          <span className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6 text-[var(--warning)]" />
          </span>
          <p className="font-bold">Necesitás una conexión segura</p>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            La cámara y el micrófono solo funcionan con <span className="font-semibold text-[var(--text)]">HTTPS</span>.
            En la compu por <span className="font-mono">localhost</span> anda; en el celular tenés que entrar por una URL <span className="font-mono">https://</span>.
          </p>
          <Button variant="secondary" onClick={close} className="w-full">Entendido</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Preview */}
          <div className="relative aspect-video rounded-2xl bg-[var(--surface-2)] dark:bg-dark-surface2 overflow-hidden flex items-center justify-center">
            {camOn && phase === 'ready' ? (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                {phase === 'checking'
                  ? <Loader2 className="w-7 h-7 animate-spin text-primary" />
                  : <Camera className="w-8 h-8 opacity-50" />}
                <span className="text-xs">{phase === 'checking' ? 'Pidiendo permisos…' : 'Cámara apagada'}</span>
              </div>
            )}
            <span className="absolute bottom-2 left-2 text-xs font-semibold bg-black/50 text-white px-2 py-0.5 rounded-full">
              {username}
            </span>
          </div>

          {/* Estado del micrófono (nivel en vivo) */}
          <div className="flex items-center gap-3">
            <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${micOk ? 'bg-primary/15 text-primary' : 'bg-[var(--surface-2)] dark:bg-dark-surface2 text-[var(--text-muted)]'}`}>
              {micOk ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </span>
            <div className="flex-1">
              <p className="text-xs font-semibold mb-1">{micOk ? 'Micrófono detectado' : 'Sin micrófono'}</p>
              <div className="h-2 rounded-full bg-[var(--surface-2)] dark:bg-dark-surface2 overflow-hidden">
                <div className="h-full bg-[var(--success)] transition-[width] duration-75" style={{ width: `${Math.round(level * 100)}%` }} />
              </div>
            </div>
          </div>

          {phase === 'denied' && (
            <p className="text-xs text-red-500">Bloqueaste el permiso. Habilitá cámara/micrófono en el ícono de candado del navegador y reintentá.</p>
          )}
          {phase === 'error' && <p className="text-xs text-red-500">{errMsg}</p>}

          {/* Toggles + entrar */}
          <div className="flex items-center gap-2">
            <button onClick={toggleCam}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 text-sm font-bold transition-all
                ${camOn ? 'border-primary bg-primary/10 text-primary' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-primary/40'}`}>
              {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />} {camOn ? 'Cámara activa' : 'Cámara apagada'}
            </button>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={close} className="flex-1">Cancelar</Button>
            <Button onClick={confirm} disabled={phase === 'checking'} className="flex-1">
              <Phone className="w-4 h-4" /> Entrar a la llamada
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
