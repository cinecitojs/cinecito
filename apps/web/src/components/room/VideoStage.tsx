// ============================================================
// apps/web/src/components/room/VideoStage.tsx
// Reproductor sincronizado unificado: YouTube / Vimeo / Dailymotion /
// PeerTube / HLS / MP4 (Archive.org y Drive se reproducen como MP4 nativo).
// Modelo: servidor autoritativo + reloj. El controlador emite comandos;
// el resto sigue la posición objetivo corrigiendo la deriva con histéresis.
//
// Cada fuente expone la misma interfaz `Adapter` (play/pause/seek/getTime…),
// así el motor de sync es idéntico para todas. Sumar una fuente = sumar un
// builder que cree su adapter; no cambia la lógica de sala ni de sync.
// ============================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Loader2, AlertTriangle } from 'lucide-react';
import { loadScript, sourceToKind, type VideoSourceKind } from '../../lib/videoSources';
import { computeTargetTime, resolveDrift } from '../../lib/sync';
import type { RoomSession } from '../../hooks/useSocket';

interface VideoLike { id: string; source: string; url: string; title?: string | null }

// Extrae el id de Dailymotion de cualquiera de sus formas de enlace.
function dailymotionId(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    let id = '';
    if (host === 'dai.ly') id = u.pathname.slice(1);
    else if (u.pathname.startsWith('/embed/video/')) id = u.pathname.split('/')[3] || '';
    else if (u.pathname.startsWith('/video/')) id = u.pathname.split('/')[2] || '';
    else id = u.searchParams.get('video') || '';
    return id.split(/[?&_]/)[0];
  } catch { return ''; }
}

interface VideoStageProps {
  video: VideoLike | null;
  session: RoomSession | null;
  /** serverNow ≈ Date.now() + serverOffset (epoch ms del servidor) */
  serverOffset: number;
  isController: boolean;
  onPlay: (t: number) => void;
  onPause: (t: number) => void;
  onSeek: (t: number) => void;
}

// Interfaz que cada adaptador expone al motor de sync.
interface Adapter {
  play(): void;
  pause(): void;
  seek(t: number): void;
  getTime(): number;
  isPaused(): boolean;
  setRate(r: number): void;
  destroy(): void;
}

export default function VideoStage({
  video, session, serverOffset, isController, onPlay, onPause, onSeek,
}: VideoStageProps) {
  const hostRef    = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<Adapter | null>(null);
  const suppress   = useRef(false); // evita re-emitir comandos al aplicar sync remoto
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [syncing, setSyncing] = useState(false);

  const kind: VideoSourceKind = video ? sourceToKind(video.source) : 'unknown';

  const serverNow = useCallback(() => Date.now() + serverOffset, [serverOffset]);

  // Posición objetivo según el estado autoritativo de la sala.
  const targetTime = useCallback((): number | null =>
    computeTargetTime(session, serverNow()), [session, serverNow]);

  const emitWhileControlling = useCallback((fn: () => void) => {
    if (suppress.current) return;
    if (!isController) return;
    fn();
  }, [isController]);

  // Play del controlador: emite el comando de reproducción a la sala.
  const handleLocalPlay = useCallback((time: number) => {
    emitWhileControlling(() => onPlay(time));
  }, [emitWhileControlling, onPlay]);

  // ── Crear / destruir el adaptador cuando cambia el video ──
  useEffect(() => {
    if (!video || !hostRef.current) return;
    let cancelled = false;
    const host = hostRef.current;
    host.innerHTML = '';
    setStatus('loading');
    setErrorMsg('');

    const fail = (msg: string) => { if (!cancelled) { setStatus('error'); setErrorMsg(msg); } };

    const buildNative = () => {
      const el = document.createElement('video');
      el.className = 'w-full h-full bg-black';
      el.playsInline = true;
      el.controls = isController;
      host.appendChild(el);

      let hls: Hls | null = null;
      const isM3u8 = kind === 'hls' || /\.m3u8($|\?)/i.test(video.url);
      if (isM3u8 && !el.canPlayType('application/vnd.apple.mpegurl') && Hls.isSupported()) {
        hls = new Hls({ enableWorker: true });
        hls.loadSource(video.url);
        hls.attachMedia(el);
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) fail('No se pudo cargar el stream HLS. Verificá el enlace.');
        });
      } else {
        el.src = video.url;
      }

      el.addEventListener('loadedmetadata', () => { if (!cancelled) setStatus('ready'); });
      el.addEventListener('error', () => fail('No se pudo cargar el video. El enlace puede ser inválido o estar protegido (CORS).'));
      el.addEventListener('play',   () => handleLocalPlay(el.currentTime));
      el.addEventListener('pause',  () => emitWhileControlling(() => onPause(el.currentTime)));
      el.addEventListener('seeked', () => emitWhileControlling(() => onSeek(el.currentTime)));

      adapterRef.current = {
        play:    () => { el.play().catch(() => {}); },
        pause:   () => el.pause(),
        seek:    (t) => { el.currentTime = t; },
        getTime: () => el.currentTime,
        isPaused:() => el.paused,
        setRate: (r) => { el.playbackRate = r; },
        destroy: () => { try { hls?.destroy(); } catch {} el.remove(); },
      };
    };

    const buildYouTube = async () => {
      try {
        await loadScript('https://www.youtube.com/iframe_api');
        await new Promise<void>((res) => {
          const w = window as any;
          if (w.YT && w.YT.Player) return res();
          const prev = w.onYouTubeIframeAPIReady;
          w.onYouTubeIframeAPIReady = () => { prev?.(); res(); };
        });
        if (cancelled) return;
        const w = window as any;
        const mount = document.createElement('div');
        mount.className = 'w-full h-full';
        host.appendChild(mount);
        const id = new URL(video.url, location.href).searchParams.get('v')
          || (video.url.includes('youtu.be/') ? video.url.split('youtu.be/')[1]?.split(/[?&]/)[0] : '')
          || video.url.split('/').pop();
        let last = 0;
        const player = new w.YT.Player(mount, {
          videoId: id,
          playerVars: { autoplay: 0, controls: isController ? 1 : 0, disablekb: isController ? 0 : 1, modestbranding: 1, rel: 0, playsinline: 1 },
          events: {
            onReady: () => { if (!cancelled) setStatus('ready'); },
            onError: () => fail('YouTube rechazó este video (privado, eliminado o no embebible).'),
            onStateChange: (e: any) => {
              const YT = w.YT.PlayerState;
              try { last = player.getCurrentTime(); } catch {}
              if (e.data === YT.PLAYING) handleLocalPlay(last);
              else if (e.data === YT.PAUSED) emitWhileControlling(() => onPause(last));
            },
          },
        });
        // YouTube no emite un evento de "seek". Lo detectamos comparando la
        // posición real con la esperada: reproduciendo avanza ~0.5s por tick;
        // un salto (adelantar/retroceder) se desvía de eso → emitimos `seek`.
        let prevTick = 0;
        const tick = setInterval(() => {
          try {
            const now = player.getCurrentTime();
            const playing = player.getPlayerState() === w.YT.PlayerState.PLAYING;
            const expected = playing ? 0.5 : 0;
            if (Math.abs((now - prevTick) - expected) > 0.9 && !suppress.current) {
              emitWhileControlling(() => onSeek(now));
            }
            prevTick = now;
            last = now;
          } catch {}
        }, 500);
        adapterRef.current = {
          play:    () => { try { player.playVideo(); } catch {} },
          pause:   () => { try { player.pauseVideo(); } catch {} },
          seek:    (t) => { try { player.seekTo(t, true); last = t; } catch {} },
          getTime: () => last,
          isPaused:() => { try { return player.getPlayerState() !== w.YT.PlayerState.PLAYING; } catch { return true; } },
          setRate: (r) => { try { player.setPlaybackRate(r); } catch {} },
          destroy: () => { clearInterval(tick); try { player.destroy(); } catch {} },
        };
      } catch {
        fail('No se pudo cargar el reproductor de YouTube.');
      }
    };

    const buildVimeo = async () => {
      try {
        await loadScript('https://player.vimeo.com/api/player.js');
        if (cancelled) return;
        const w = window as any;
        const mount = document.createElement('div');
        mount.className = 'w-full h-full';
        host.appendChild(mount);
        const id = video.url.split('/').filter(Boolean).pop();
        const player = new w.Vimeo.Player(mount, {
          id, controls: isController, responsive: true, autoplay: false,
        });
        let last = 0;
        player.on('timeupdate', (d: any) => { last = d.seconds; });
        player.on('play',   () => handleLocalPlay(last));
        player.on('pause',  () => emitWhileControlling(() => onPause(last)));
        player.on('seeked', (d: any) => emitWhileControlling(() => onSeek(d.seconds)));
        player.on('error',  () => fail('Vimeo no pudo reproducir este video.'));
        player.ready().then(() => { if (!cancelled) setStatus('ready'); }).catch(() => fail('Vimeo no respondió.'));
        adapterRef.current = {
          play:    () => player.play().catch(() => {}),
          pause:   () => player.pause().catch(() => {}),
          seek:    (t) => { player.setCurrentTime(t).catch(() => {}); last = t; },
          getTime: () => last,
          isPaused:() => true,
          setRate: (r) => { player.setPlaybackRate(r).catch(() => {}); },
          destroy: () => { try { player.destroy(); } catch {} },
        };
      } catch {
        fail('No se pudo cargar el reproductor de Vimeo.');
      }
    };

    // Dailymotion: SDK propio (DM.player) con API de play/pause/seek y eventos,
    // igual patrón que YouTube/Vimeo → sincronización plena.
    const buildDailymotion = async () => {
      try {
        await loadScript('https://api.dmcdn.net/all.js');
        if (cancelled) return;
        const w = window as any;
        if (!w.DM || !w.DM.player) { fail('No se pudo cargar el reproductor de video.'); return; }
        const mount = document.createElement('div');
        mount.className = 'w-full h-full';
        host.appendChild(mount);
        const id = dailymotionId(video.url);
        let last = 0;
        const player = w.DM.player(mount, {
          video: id,
          width: '100%',
          height: '100%',
          params: { autoplay: false, 'queue-enable': false, 'ui-logo': false, controls: isController },
        });
        player.addEventListener('apiready', () => { if (!cancelled) setStatus('ready'); });
        player.addEventListener('error',   () => fail('No se pudo reproducir este video.'));
        player.addEventListener('timeupdate', () => { try { last = player.currentTime || last; } catch {} });
        player.addEventListener('play',  () => handleLocalPlay(last));
        player.addEventListener('pause', () => emitWhileControlling(() => onPause(last)));
        player.addEventListener('seeked', () => { try { last = player.currentTime; } catch {} emitWhileControlling(() => onSeek(last)); });
        adapterRef.current = {
          play:    () => { try { player.play(); } catch {} },
          pause:   () => { try { player.pause(); } catch {} },
          seek:    (t) => { try { player.seek(t); last = t; } catch {} },
          getTime: () => last,
          isPaused:() => { try { return !!player.paused; } catch { return true; } },
          setRate: () => { /* Dailymotion no expone playbackRate estable; el seek corrige la deriva */ },
          destroy: () => { try { player.destroy?.(); } catch {} },
        };
      } catch {
        fail('No se pudo cargar el reproductor de video.');
      }
    };

    // PeerTube: iframe de embed + API oficial por postMessage (@peertube/embed-api).
    // Carga diferida del SDK; si falla, error limpio. Sincronización plena.
    const buildPeerTube = async () => {
      try {
        const iframe = document.createElement('iframe');
        iframe.className = 'w-full h-full';
        iframe.setAttribute('allowfullscreen', 'true');
        iframe.setAttribute('allow', 'autoplay; fullscreen');
        iframe.setAttribute('frameborder', '0');
        // ?api=1 habilita la API de control; sin controls para los no-controladores.
        const sep = video.url.includes('?') ? '&' : '?';
        iframe.src = `${video.url}${sep}api=1&controls=${isController ? 1 : 0}&peertubeLink=0&title=0&warningTitle=0`;
        host.appendChild(iframe);

        const { PeerTubePlayer } = await import('@peertube/embed-api');
        if (cancelled) { iframe.remove(); return; }
        const player = new PeerTubePlayer(iframe);
        let last = 0;
        await player.ready;
        if (cancelled) { try { player.destroy(); } catch {} return; }
        setStatus('ready');
        player.addEventListener('playbackStatusUpdate', (d: any) => {
          if (typeof d?.position === 'number') last = d.position;
        });
        player.addEventListener('play',  () => handleLocalPlay(last));
        player.addEventListener('pause', () => emitWhileControlling(() => onPause(last)));
        adapterRef.current = {
          play:    () => { try { player.play(); } catch {} },
          pause:   () => { try { player.pause(); } catch {} },
          seek:    (t) => { try { player.seek(t); last = t; } catch {} },
          getTime: () => last,
          isPaused:() => true, // PeerTube no expone un getter fiable; sync se apoya en la posición
          setRate: (r) => { try { player.setPlaybackRate(r); } catch {} },
          destroy: () => { try { player.destroy(); } catch {} },
        };
      } catch {
        fail('No se pudo cargar el reproductor de video.');
      }
    };

    if (kind === 'youtube') buildYouTube();
    else if (kind === 'vimeo') buildVimeo();
    else if (kind === 'dailymotion') buildDailymotion();
    else if (kind === 'peertube') buildPeerTube();
    else buildNative();

    return () => {
      cancelled = true;
      try { adapterRef.current?.destroy(); } catch {}
      adapterRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.id, video?.url, kind, isController]);

  // ── Aplicar el estado de la sala al adaptador (sync) ──
  useEffect(() => {
    if (status !== 'ready' || !session) return;
    const a = adapterRef.current;
    if (!a) return;

    const apply = () => {
      const target = targetTime();
      if (target == null) return;

      suppress.current = true;
      const action = resolveDrift(target, a.getTime());
      if (action.kind === 'seek') {
        setSyncing(true);
        a.seek(target);
        setTimeout(() => setSyncing(false), 500);
      }
      a.setRate(action.rate);

      if (session.isPlaying && a.isPaused()) a.play();
      if (!session.isPlaying && !a.isPaused()) a.pause();

      setTimeout(() => { suppress.current = false; }, 120);
    };

    apply();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.version, status]);

  // ── Loop de corrección periódica (cada 2.5s) para no quedar a la deriva ──
  useEffect(() => {
    if (status !== 'ready') return;
    const iv = setInterval(() => {
      const a = adapterRef.current;
      if (!a || !session || !session.isPlaying) return;
      const target = targetTime();
      if (target == null) return;
      suppress.current = true;
      const action = resolveDrift(target, a.getTime());
      if (action.kind === 'seek') a.seek(target);
      a.setRate(action.rate);
      setTimeout(() => { suppress.current = false; }, 120);
    }, 2500);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.version]);

  // ── Render ──
  if (!video) {
    return (
      <div className="aspect-video bg-[#0d1520] rounded-3xl flex flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
        <img src="/pocine-empty.png?v=20260622" alt="" aria-hidden="true" className="w-48 h-auto opacity-90" />
        <p className="text-sm font-medium">Sin video seleccionado</p>
        {isController && <p className="text-xs opacity-60">Agregá uno en la cola de videos</p>}
      </div>
    );
  }

  return (
    <div className="aspect-video bg-black rounded-3xl overflow-hidden relative">
      <div ref={hostRef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />

      {/* Bloquea interacción del que no controla (excepto fullscreen del navegador).
          Los players con iframe/SDK propio ya reciben controls=0 para no-controladores. */}
      {!isController && status === 'ready' && !['youtube', 'vimeo', 'dailymotion', 'peertube'].includes(kind) && (
        <div className="absolute inset-0" aria-hidden />
      )}

      {(status === 'loading' || syncing) && status !== 'error' && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 bg-[#0d1520] flex flex-col items-center justify-center gap-2 text-center px-6">
          <AlertTriangle className="w-10 h-10 text-[var(--warning)]" />
          <p className="text-sm font-semibold text-[var(--text)]">No se pudo reproducir</p>
          <p className="text-xs text-[var(--text-muted)] max-w-sm">{errorMsg}</p>
          {isController && <p className="text-xs text-[var(--text-muted)] opacity-70">Probá con otro enlace o quitá este de la cola.</p>}
        </div>
      )}
    </div>
  );
}
