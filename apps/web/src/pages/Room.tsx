// apps/web/src/pages/Room.tsx
// Sala con motor de video multi-fuente sincronizado, reconexión robusta y permisos.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Crown, Users, MessageSquare, Play, Settings2, Link as LinkIcon,
  Clapperboard, Minimize2, Phone, PhoneOff, UserPlus, Inbox, Flag,
  HelpCircle, RotateCw, X,
} from 'lucide-react';
import { roomsApi, messagesApi, uploadsApi } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useSocket, type ChatMessage, type RoomSession, type RoomPermissions } from '../hooks/useSocket';
import { parseVideoUrl } from '../lib/videoSources';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Badge, Modal, Input, Button, Spinner, toast, ToastContainer } from '../components/ui';
import { ParticipantsPanel, VideoQueue, InviteBanner, PermissionsPanel } from '../components/room';
import VideoStage from '../components/room/VideoStage';
import ChatPanel from '../components/room/ChatPanel';
import VoicePanel from '../components/room/VoicePanel';
import InviteModal from '../components/room/InviteModal';
import FloatingWidget from '../components/FloatingWidget';
import { useCall } from '../providers/CallProvider';
import { capacityChip, capacityFullText } from '../lib/roomCapacity';
import { getSettings } from '../store/useSettings';
import { RequestAccessScreen, JoinRequestsPanel, type AccessState, type JoinRequest } from '../components/room/JoinRequests';
import ReportModal, { type ReportTarget } from '../components/ReportModal';
import RoomThemeBackdrop from '../components/room/RoomThemeBackdrop';
import { useSupporter } from '../hooks/useSupporter';
import { ReactionsOverlay, ReactionBar, useFloatingReactions } from '../components/room/FloatingReactions';
import OnboardingTour, { TOUR_SEEN_KEY } from '../components/room/OnboardingTour';
import CountdownOverlay from '../components/room/CountdownOverlay';

const DEFAULT_PERMS: RoomPermissions = {
  addVideo: 'host', removeVideo: 'host', skip: 'host', pauseResume: 'everyone', seek: 'everyone',
};

type MobileTab = 'video' | 'chat' | 'sala';

// Video + capa de reacciones flotantes + barra de emojis. Definido a nivel de
// módulo (identidad estable) para que VideoStage NO se remonte en cada render.
function StageWithReactions({
  stageProps, items, onReact, compactBar, hideBar, countdown, serverOffset, onCountdownDone,
}: {
  stageProps: any;
  items: { id: number; emoji: string; left: number; drift: number; scale: number }[];
  onReact: (emoji: string) => void;
  compactBar?: boolean;
  hideBar?: boolean;
  countdown?: { startAt: number; durationMs: number } | null;
  serverOffset?: number;
  onCountdownDone?: () => void;
}) {
  return (
    <div className="relative">
      <VideoStage {...stageProps} />
      <ReactionsOverlay items={items} />
      {countdown && (
        <CountdownOverlay
          startAt={countdown.startAt}
          durationMs={countdown.durationMs}
          serverOffset={serverOffset ?? 0}
          onDone={onCountdownDone ?? (() => {})}
        />
      )}
      {/* Arriba a la derecha: no tapa la barra de controles del reproductor (abajo). */}
      {!hideBar && <ReactionBar onPick={onReact} compact={compactBar} className="absolute top-2 right-2 z-30" />}
    </div>
  );
}

export default function Room() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate       = useNavigate();
  const { user, token } = useAuthStore();

  const [messages, setMessages]       = useState<ChatMessage[]>([]);
  const [session, setSession]         = useState<RoomSession | null>(null);
  const [onlineIds, setOnlineIds]     = useState<string[]>([]);
  // Capacidad de participantes ACTIVOS (en videollamada). El servidor es la fuente
  // de verdad y lo difunde a TODA la sala (activos y espectadores). max viene del server.
  const [voiceRoomState, setVoiceRoomState] = useState<{
    active: number; max: number; full: boolean; activeUserIds: string[]; waitingUserIds: string[];
  }>({ active: 0, max: 4, full: false, activeUserIds: [], waitingUserIds: [] });
  const waitingRef = useRef(false); // espejo de isWaiting para listeners del socket
  const [typingUserIds, setTypingIds] = useState<string[]>([]);
  const [isHost, setIsHost]           = useState(false);
  const [permissions, setPermissions] = useState<RoomPermissions>(DEFAULT_PERMS);
  const [mobileTab, setMobileTab]     = useState<MobileTab>('video');
  const [unreadChat, setUnreadChat]   = useState(0);

  // ── Solo invitación: acceso por solicitud ──
  const [accessState, setAccessState]   = useState<AccessState>('ok');
  const [reqRoomName, setReqRoomName]   = useState<string | undefined>();
  const [reqLoading, setReqLoading]     = useState(false);
  const [requests, setRequests]         = useState<JoinRequest[]>([]);
  const [pendingReqs, setPendingReqs]   = useState(0);
  const [showRequests, setShowRequests] = useState(false);

  // ── Reportes ──
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  // ── Tema de sala (recompensa cosmética; solo si está desbloqueado) ──
  const { data: supporter } = useSupporter();
  const activeTheme = supporter?.theme && supporter.unlockedThemes?.includes(supporter.theme) ? supporter.theme : null;

  // Monta UN solo layout según el viewport (no por CSS): si se renderizan
  // los dos, hay dos <VideoStage> y `display:none` NO frena el audio → audio doble.
  const isDesktop = useMediaQuery('(min-width: 768px)');

  // ── Orientación / dispositivo táctil (modo cine automático) ──
  // `isTouch` distingue móvil/tablet de PC (no por ancho: una tablet en horizontal
  // puede ser ancha). En táctiles el modo cine sigue la orientación por defecto.
  const isTouch     = useMediaQuery('(pointer: coarse)');
  const isLandscape = useMediaQuery('(orientation: landscape)');

  // ── Modo cine (#3) + widgets flotantes PiP (#4) + salida (#1) ──
  // En táctiles arranca según la orientación (horizontal = cine). En PC, lo guardado.
  const [theater, setTheater]   = useState(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        && window.matchMedia('(pointer: coarse)').matches) {
      return window.matchMedia('(orientation: landscape)').matches;
    }
    return localStorage.getItem('cinecito_theater') === '1';
  });
  const [showChatW, setShowChatW] = useState(() => localStorage.getItem('cinecito_w_chat') !== '0');
  const [showCallW, setShowCallW] = useState(() => localStorage.getItem('cinecito_w_call') !== '0');
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  useEffect(() => { localStorage.setItem('cinecito_theater', theater ? '1' : '0'); }, [theater]);
  useEffect(() => { localStorage.setItem('cinecito_w_chat', showChatW ? '1' : '0'); }, [showChatW]);
  useEffect(() => { localStorage.setItem('cinecito_w_call', showCallW ? '1' : '0'); }, [showCallW]);

  // Modo cine automático por orientación (solo táctiles): al girar a horizontal
  // se activa por defecto; al volver a vertical se sale. El usuario puede
  // sobreescribirlo con el botón hasta el próximo giro.
  const lastLandscapeRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!isTouch) return;
    if (lastLandscapeRef.current === null) { lastLandscapeRef.current = isLandscape; return; }
    if (isLandscape !== lastLandscapeRef.current) {
      lastLandscapeRef.current = isLandscape;
      setTheater(isLandscape);
    }
  }, [isTouch, isLandscape]);

  // Hint "girar pantalla" (descartable, recordado por sesión).
  const [rotateHintOff, setRotateHintOff] = useState(() => sessionStorage.getItem('cinecito_rotate_hint') === '0');
  const dismissRotateHint = useCallback(() => {
    setRotateHintOff(true);
    sessionStorage.setItem('cinecito_rotate_hint', '0');
  }, []);

  // Cajón (chat / sala) dentro del modo cine móvil.
  const [cineDrawer, setCineDrawer] = useState<'none' | 'chat' | 'sala'>('none');

  // Reacciones flotantes efímeras (#8).
  const reactions = useFloatingReactions();

  // Cuenta regresiva cinematográfica (3·2·1·play) sincronizada por el servidor.
  const [countdown, setCountdown] = useState<{ startAt: number; durationMs: number } | null>(null);
  const countdownRef = useRef(countdown);
  countdownRef.current = countdown; // espejo para el listener de room-state

  // Mini tutorial de bienvenida (onboarding).
  const [tourOpen, setTourOpen] = useState(false);
  const tourCheckedRef = useRef(false);
  const closeTour = useCallback(() => { setTourOpen(false); try { localStorage.setItem(TOUR_SEEN_KEY, '1'); } catch { /* */ } }, []);

  // Reloj: offset entre el servidor y este cliente.
  const serverOffsetRef = useRef(0);
  const [serverOffset, setServerOffset] = useState(0);

  // Modal de agregar video (único, multi-fuente).
  const [addOpen, setAddOpen]   = useState(false);
  const [addUrl, setAddUrl]     = useState('');
  const [addTitle, setAddTitle] = useState('');
  const [adding, setAdding]     = useState(false);
  const [permsOpen, setPermsOpen] = useState(false);

  const parsed = addUrl.trim() ? parseVideoUrl(addUrl) : null;

  const { data: room, refetch, isError, isFetching } = useQuery({
    queryKey: ['room', roomId],
    queryFn:  () => roomsApi.getById(roomId!).then((r) => r.data),
    enabled:  !!roomId,
    retry: 2, // reintentos extra para sobrevivir al arranque en frío del backend
  });

  const socket = useSocket({
    token,
    onDisconnect: () => toast('Conexión perdida. Reconectando…', 'error'),
  });

  // Enviar reacción: el servidor la difunde a TODA la sala (incluido el emisor),
  // así todos ven lo mismo. El spawn local ocurre al recibir el eco.
  const pickReaction = useCallback((emoji: string) => {
    if (roomId) socket.sendReaction(roomId, emoji);
  }, [roomId]);

  // Abre el mini tutorial la primera vez (una sola vez, al cargar la sala).
  useEffect(() => {
    if (tourCheckedRef.current || !room) return;
    tourCheckedRef.current = true;
    try { if (!localStorage.getItem(TOUR_SEEN_KEY)) setTourOpen(true); } catch { /* */ }
  }, [room]);

  // La llamada vive a nivel de app (CallProvider) → sobrevive al salir de la sala.
  const voice = useCall();
  const inVoiceHere = voice.inVoice && voice.callRoomId === roomId;

  // Ref siempre actual de `voice` para usar dentro de listeners globales sin
  // re-suscribir en cada render ni capturar estado obsoleto.
  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  // Salir con confirmación solo si la llamada activa es de ESTA sala (#1).
  const requestLeave = useCallback(() => {
    const v = voiceRef.current;
    if (v.inVoice && v.callRoomId === roomId) setLeaveOpen(true);
    else navigate('/home');
  }, [navigate, roomId]);
  const cutCallAndLeave = useCallback(() => {
    voiceRef.current.leaveVoice();
    setLeaveOpen(false);
    navigate('/home');
  }, [navigate]);
  // Opción 2: salir de la sala PERO mantener la llamada (sigue en el widget flotante).
  const leaveKeepCall = useCallback(() => {
    setLeaveOpen(false);
    navigate('/home');
  }, [navigate]);

  // Aviso del navegador al cerrar/recargar la pestaña con llamada activa (#1).
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (voiceRef.current.inVoice) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Atajos de teclado (#7): F = modo cine, M = mute, V = cámara.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      const v = voiceRef.current;
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); setTheater((t) => !t); }
      else if (v.inVoice && (e.key === 'm' || e.key === 'M')) v.toggleMute();
      else if (v.inVoice && (e.key === 'v' || e.key === 'V')) v.toggleVideo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const applyJoinResult = useCallback((result: any) => {
    setMessages(result.messages || []);
    setSession(result.session);
    setOnlineIds(result.onlineUserIds || []);
    setIsHost(!!result.isHost);
    if (result.permissions) setPermissions(result.permissions);
    if (typeof result.serverTime === 'number') {
      const off = result.serverTime - Date.now();
      serverOffsetRef.current = off;
      setServerOffset(off);
    }
  }, []);

  // Unirse a la sala — y RE-UNIRSE automáticamente en cada (re)conexión.
  useEffect(() => {
    if (!roomId) return;
    let alive = true;

    const join = async () => {
      try {
        const result = await socket.joinRoom(roomId);
        if (alive) { applyJoinResult(result); setAccessState('ok'); }
      } catch (err: any) {
        if (!alive) return;
        if (err?.code === 'request_required') {
          // Sala "Solo invitación": mostrar pantalla de solicitud (sin pisar 'requested'/'rejected').
          if (err.roomName) setReqRoomName(err.roomName);
          setAccessState((s) => (s === 'ok' ? 'request' : s));
        } else {
          toast('No se pudo unir a la sala', 'error');
        }
      }
    };

    // Re-join en connect/reconnect (el socket nuevo no está unido en el server).
    const offConnect = socket.on('connect', () => { void join(); });
    // Primer intento (por si ya está conectado).
    if (socket.isConnected()) void join();

    return () => {
      alive = false;
      offConnect();
      socket.leaveRoom(roomId);
    };
  }, [roomId, token]);

  // Re-sincronizar al volver a la pestaña.
  useEffect(() => {
    const onVis = async () => {
      if (document.visibilityState === 'visible' && roomId) {
        const { session: s, serverTime } = await socket.requestSync(roomId);
        if (s) setSession(s);
        const off = serverTime - Date.now();
        serverOffsetRef.current = off;
        setServerOffset(off);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [roomId]);

  // Eventos de socket.
  useEffect(() => {
    if (!roomId) return;
    const offs = [
      socket.on<ChatMessage>('message', (msg) => {
        setMessages((p) => [...p, msg]);
        if (mobileTab !== 'chat') setUnreadChat((n) => n + 1);
        // Notificación del navegador (Configuración → Notificaciones): solo si la
        // pestaña está oculta, el aviso está activado, hay permiso, y no es propio.
        if (document.hidden && msg.userId && msg.userId !== user?.id
            && getSettings().notifyMessages
            && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification(`${msg.user?.username || 'Mensaje'} · ${room?.name || 'Cinecito'}`, {
              body: msg.content?.slice(0, 120), icon: '/pochi.png?v=20260622', tag: `room-${roomId}`,
            });
          } catch { /* */ }
        }
      }),
      // Mensajes de sistema efímeros (join/leave/transferencia): se muestran, no se persisten.
      socket.on<ChatMessage>('system', (msg) => setMessages((p) => [...p, msg])),
      socket.on<{ messageId: string; reactions: Record<string, string[]> }>('message-reaction-update',
        ({ messageId, reactions }) => setMessages((p) => p.map((m) => m.id === messageId ? { ...m, reactions } : m))),
      socket.on<{ session: RoomSession; serverTime: number }>('room-state', ({ session: s, serverTime }) => {
        setSession(s);
        if (typeof serverTime === 'number') {
          const off = serverTime - Date.now();
          serverOffsetRef.current = off;
          setServerOffset(off);
        }
        // Si llega un estado PAUSADO mientras hay cuenta regresiva activa, es una
        // cancelación (el host pausó/cambió de video) → cortamos el conteo. El
        // "hold" inicial llega ANTES del evento room-countdown, así que no la pisa.
        if (!s.isPlaying && countdownRef.current) setCountdown(null);
      }),
      // Cuenta regresiva cinematográfica sincronizada (3·2·1·play).
      socket.on<{ startAt: number; durationMs: number }>('room-countdown',
        ({ startAt, durationMs }) => setCountdown({ startAt, durationMs })),
      socket.on<{ userId: string }>('user-joined', ({ userId }) => {
        if (userId) setOnlineIds((p) => [...new Set([...p, userId])]);
        refetch();
      }),
      socket.on<{ userId: string }>('user-left', ({ userId }) =>
        setOnlineIds((p) => p.filter((id) => id !== userId))),
      // Capacidad de videollamada (activos/espera) difundida a toda la sala.
      socket.on<typeof voiceRoomState>('voice-room-state', (st) => setVoiceRoomState(st)),
      socket.on('voice-slot-free', () => {
        if (waitingRef.current) toast('¡Se liberó un lugar en la videollamada! Tocá "Unirse" 🎥', 'success');
      }),
      // Reacción flotante efímera (#8): spawnea el emoji sobre el video.
      socket.on<{ emoji: string }>('room-reaction', ({ emoji }) => reactions.spawn(emoji)),
      socket.on<{ typingUserIds: string[] }>('typing-update', ({ typingUserIds }) =>
        setTypingIds(typingUserIds)),
      socket.on<{ permissions: RoomPermissions }>('permissions-updated', ({ permissions }) =>
        setPermissions(permissions)),
      socket.on('video-added',   () => refetch()),
      socket.on('video-removed', () => refetch()),
      socket.on<{ newHostId: string }>('host-changed', ({ newHostId }) => {
        setIsHost(newHostId === user?.id);
        if (newHostId === user?.id) toast('Ahora controlás la reproducción 🎬', 'success');
        refetch();
      }),
      // ── Solo invitación ──
      socket.on<{ request: JoinRequest; pending: number }>('join-request-new', ({ request, pending }) => {
        setRequests((prev) => [request, ...prev.filter((r) => r.userId !== request.userId)]);
        if (typeof pending === 'number') setPendingReqs(pending);
        toast(`${request.username} quiere entrar a la sala`, 'info');
      }),
      socket.on<{ requests: JoinRequest[]; pending: number }>('join-requests-updated', ({ requests: rs, pending }) => {
        if (Array.isArray(rs)) setRequests(rs);
        if (typeof pending === 'number') setPendingReqs(pending);
      }),
      socket.on<{ status: string }>('join-request-resolved', ({ status }) => {
        if (status === 'accepted') rejoin();
        else if (status === 'rejected') setAccessState('rejected');
      }),
    ];
    return () => offs.forEach((off) => off());
  }, [roomId, mobileTab, user?.id]);

  useEffect(() => { if (mobileTab === 'chat') setUnreadChat(0); }, [mobileTab]);

  useEffect(() => {
    document.title = unreadChat > 0 && mobileTab !== 'chat'
      ? `(${unreadChat}) ${room?.name || 'Sala'} — Cinecito`
      : `${room?.name || 'Sala'} — Cinecito`;
    return () => { document.title = 'Cinecito'; };
  }, [unreadChat, room?.name, mobileTab]);

  const sendMessage = useCallback(async (content: string) => {
    if (!roomId) return;
    try { await socket.sendMessage(roomId, content); }
    catch { await messagesApi.send(roomId, content); }
  }, [roomId]);

  const loadMoreMessages = useCallback(async (before: string): Promise<boolean> => {
    if (!roomId) return false;
    try {
      const { data } = await messagesApi.list(roomId, { before, limit: 30 });
      const older = data.messages as ChatMessage[];
      if (older.length > 0) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          return [...older.filter((m) => !ids.has(m.id)), ...prev];
        });
      }
      return data.hasMore;
    } catch { return false; }
  }, [roomId]);

  // ── Solo invitación: re-ingreso al ser aceptado, solicitar, responder (host) ──
  const rejoin = useCallback(async () => {
    if (!roomId) return;
    try {
      const result = await socket.joinRoom(roomId);
      applyJoinResult(result);
      setAccessState('ok');
      refetch();
    } catch (err: any) {
      if (err?.code === 'request_required') setAccessState('request');
    }
  }, [roomId, applyJoinResult, refetch]);

  const submitAccessRequest = useCallback(async () => {
    if (!roomId) return;
    setReqLoading(true);
    const res = await socket.requestJoin(roomId);
    setReqLoading(false);
    if (res?.error) { toast(res.message || 'No se pudo enviar la solicitud', 'error'); return; }
    if (res?.status === 'accepted') { rejoin(); return; }
    setAccessState('requested');
  }, [roomId, rejoin]);

  const respondRequest = useCallback(async (uid: string, action: 'accept' | 'reject' | 'ignore') => {
    if (!roomId) return;
    setRequests((prev) => prev.map((r) => r.userId === uid
      ? { ...r, status: action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'ignored' } : r));
    await socket.respondJoinRequest(roomId, uid, action);
  }, [roomId]);

  // Cargar la bandeja del host (solo salas "Solo invitación").
  useEffect(() => {
    if (!roomId || !isHost || !(room as any)?.inviteOnly) return;
    socket.listJoinRequests(roomId).then(({ requests: rs, pending }) => {
      setRequests(rs); setPendingReqs(pending);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, isHost, (room as any)?.inviteOnly]);

  // Permisos derivados.
  const canControl = isHost || permissions.pauseResume === 'everyone' || permissions.seek === 'everyone';
  const canAdd     = isHost || permissions.addVideo === 'everyone';
  const canRemove  = isHost || permissions.removeVideo === 'everyone';
  const canSelect  = isHost || permissions.skip === 'everyone';

  const submitAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId || !parsed?.valid) return;
    setAdding(true);
    try {
      await uploadsApi.addUrl({ roomId, url: parsed.url, title: addTitle.trim() || undefined });
      toast(`${parsed.label} agregado`, 'success');
      setAddOpen(false); setAddUrl(''); setAddTitle('');
    } catch (err: any) {
      toast(err?.response?.data?.error || 'No se pudo agregar el video', 'error');
    } finally { setAdding(false); }
  };

  const savePermissions = async (next: RoomPermissions) => {
    setPermissions(next);
    if (!roomId) return;
    try { await socket.updatePermissions(roomId, next); }
    catch { toast('No se pudieron guardar los permisos', 'error'); }
  };

  const currentVideo = room?.videos?.find((v: any) => v.id === session?.currentVideoId) || null;

  const onlineUsers = (room?.members || []).map((m: any) => ({
    id: m.userId, username: m.user?.username || m.displayName,
  })).filter((m: any) => m.id);
  if (room?.owner && !onlineUsers.find((u: any) => u.id === room.owner.id)) {
    onlineUsers.unshift({ id: room.owner.id, username: room.owner.username });
  }

  // ¿Estoy en la lista de espera por un cupo activo? (hook ANTES de cualquier return
  // → respeta las Rules of Hooks). Ref espejo para usarlo en listeners del socket.
  const isWaiting = !!user?.id && voiceRoomState.waitingUserIds.includes(user.id);
  useEffect(() => { waitingRef.current = isWaiting; }, [isWaiting]);

  // Sala "Solo invitación" sin acceso: pantalla de solicitud (no depende del fetch de la sala,
  // que para un no-miembro devuelve 403).
  if (accessState !== 'ok') {
    return (
      <RequestAccessScreen
        roomName={reqRoomName || room?.name}
        state={accessState}
        loading={reqLoading}
        onRequest={submitAccessRequest}
      />
    );
  }

  if (!room) {
    // Error de carga (red caída, timeout por arranque en frío, etc.): NO dejamos
    // un spinner infinito → mostramos un mensaje claro con reintento.
    if (isError && !isFetching) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
          <img src="/pochi-sleep.png?v=20260622" alt="" className="w-32 h-auto select-none" draggable={false} />
          <div>
            <p className="font-display font-bold text-lg">No pudimos cargar la sala</p>
            <p className="text-sm text-[var(--text-muted)] mt-1 max-w-xs">
              La conexión tardó demasiado o se interrumpió. Suele pasar la primera vez si el servidor estaba en reposo.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => refetch()}>Reintentar</Button>
            <Button variant="secondary" onClick={() => navigate('/home')}>Volver al inicio</Button>
          </div>
        </div>
      );
    }
    return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  }

  const stageProps = {
    video: currentVideo, session, serverOffset, isController: canControl,
    onPlay:  (t: number) => roomId && socket.videoPlay(roomId, t),
    onPause: (t: number) => roomId && socket.videoPause(roomId, t),
    onSeek:  (t: number) => roomId && socket.videoSeek(roomId, t),
  };

  // Props comunes de la cuenta regresiva para cada vista del VideoStage.
  const stageExtra = { countdown, serverOffset, onCountdownDone: () => setCountdown(null) };

  const queueProps = {
    videos: room.videos || [],
    currentVideoId: session?.currentVideoId,
    canAdd, canRemove, canSelect,
    onSelect: (id: string) => roomId && socket.videoSelect(roomId, id),
    onAddVideo: () => setAddOpen(true),
    onRemove: async (id: string) => {
      try { await uploadsApi.deleteVideo(id); }
      catch { toast('No se pudo eliminar', 'error'); }
    },
    onReportVideo: (v: { id: string; title?: string; url?: string }) =>
      setReportTarget({ type: 'link', id: v.id, context: [roomId, v.url, v.title].filter(Boolean).join(' · '), label: v.title || v.url || 'este enlace' }),
  };

  const participantsProps = {
    room, onlineUserIds: onlineIds, currentUserId: user?.id, isHost,
    activeUserIds: voiceRoomState.activeUserIds, waitingUserIds: voiceRoomState.waitingUserIds,
    onTransferHost: (uid: string) =>
      roomId && socket.transferHost(roomId, uid)
        .then(() => toast('Control transferido', 'success'))
        .catch(() => toast('No se pudo transferir', 'error')),
    onReportUser: (u: { id: string; username: string }) =>
      setReportTarget({ type: 'user', id: u.id, context: roomId, label: u.username }),
  };

  const voiceProps = {
    inVoice: inVoiceHere, muted: voice.muted, videoOn: voice.videoOn,
    connecting: voice.connecting, error: voice.error,
    peers: inVoiceHere ? voice.peers : {}, speaking: inVoiceHere ? voice.speaking : {},
    netQuality: voice.netQuality, peerQuality: voice.peerQuality, peerStats: voice.peerStats, saving: voice.saving,
    activeCount: voiceRoomState.active, maxActive: voiceRoomState.max, roomFull: voiceRoomState.full,
    isWaiting,
    currentUsername: user?.username || 'Vos', localStream: voice.localStream,
    onJoin: (withVideo?: boolean) => roomId && voice.joinVoice(roomId, withVideo),
    onLeave: voice.leaveVoice,
    onToggleMute: voice.toggleMute, onToggleVideo: voice.toggleVideo,
    onRequestSlot: () => roomId && voice.requestSlot(roomId),
    onCancelSlot: () => roomId && voice.cancelSlot(roomId),
  };

  const chatPanelProps = {
    roomId: roomId!, messages, typingUserIds,
    onSend: sendMessage, onLoadMore: loadMoreMessages,
    currentUserId: user?.id, onlineUsers,
    onStartTyping: socket.startTyping, onStopTyping: socket.stopTyping,
    onReact: (messageId: string, emoji: string) => roomId && socket.reactToMessage(roomId, messageId, emoji),
    onReportMessage: (msg: ChatMessage) =>
      setReportTarget({
        type: 'message', id: msg.id,
        context: [roomId, (msg.content || '').slice(0, 140)].filter(Boolean).join(' · '),
        label: `el mensaje de ${msg.user?.username || 'un usuario'}`,
      }),
  };

  return (
    <div className="relative h-[100dvh] overflow-hidden flex flex-col bg-[var(--bg)] dark:bg-dark-bg">
      {activeTheme && <RoomThemeBackdrop themeId={activeTheme} />}
      <ToastContainer />

      <header className="shrink-0 h-14 border-b border-[var(--border)] bg-surface/90 dark:bg-dark-surface/90 backdrop-blur-sm flex items-center gap-3 px-4 sticky top-0 z-20">
        <button onClick={requestLeave}
          className="p-2 rounded-xl hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2 transition-colors shrink-0"
          aria-label="Salir de la sala" title="Salir de la sala">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <h1 className="font-bold text-sm leading-tight truncate hidden sm:block">{room.name}</h1>
          <InviteBanner code={room.code} roomName={room.name} />
          {/* Aviso permanente de capacidad (texto completo en el tooltip). No invasivo. */}
          <span title={capacityFullText(voiceRoomState.max)}
            className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] bg-[var(--surface-2)] dark:bg-dark-surface2 px-2 py-1 rounded-full whitespace-nowrap shrink-0">
            <Users className="w-3 h-3" /> {capacityChip(voiceRoomState.max)}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setInviteOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-semibold"
            aria-label="Invitar amigos" title="Invitar amigos">
            <UserPlus className="w-4 h-4" /> <span className="hidden sm:inline">Invitar</span>
          </button>
          {/* Modo cine: en táctiles muestra TEXTO ("Modo cine" / "Salir de modo cine"),
              en PC un botón-ícono con atajo F. */}
          {isTouch ? (
            <button onClick={() => setTheater((t) => !t)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-colors text-xs font-semibold whitespace-nowrap shrink-0
                ${theater ? 'bg-primary text-white' : 'bg-[var(--surface-2)] dark:bg-dark-surface2 hover:bg-primary/10'}`}
              aria-label={theater ? 'Salir de modo cine' : 'Modo cine'}
              title={theater ? 'Salir de modo cine' : 'Modo cine'}>
              {theater ? <Minimize2 className="w-4 h-4" /> : <Clapperboard className="w-4 h-4" />}
              <span className="hidden min-[420px]:inline">{theater ? 'Salir de modo cine' : 'Modo cine'}</span>
            </button>
          ) : isDesktop && (
            <button onClick={() => setTheater((t) => !t)}
              className={`p-2 rounded-xl transition-colors ${theater ? 'bg-primary text-white' : 'hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2'}`}
              aria-label="Modo cine" title="Modo cine (F)">
              {theater ? <Minimize2 className="w-4 h-4" /> : <Clapperboard className="w-4 h-4" />}
            </button>
          )}
          <button onClick={() => setTourOpen(true)}
            className="p-2 rounded-xl hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2 transition-colors text-[var(--text-muted)] hover:text-primary"
            aria-label="Guía de la sala" title="¿Cómo funciona? Ver guía">
            <HelpCircle className="w-4 h-4" />
          </button>
          {isHost && (room as any)?.inviteOnly && (
            <button onClick={() => setShowRequests(true)}
              className="relative p-2 rounded-xl hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2 transition-colors"
              aria-label="Solicitudes de acceso" title="Solicitudes de acceso">
              <Inbox className="w-4 h-4" />
              {pendingReqs > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-secondary text-white text-[10px] flex items-center justify-center font-bold">
                  {pendingReqs > 9 ? '9+' : pendingReqs}
                </span>
              )}
            </button>
          )}
          {isHost && (
            <>
              <button onClick={() => setPermsOpen(true)}
                className="p-2 rounded-xl hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2 transition-colors"
                aria-label="Permisos de la sala" title="Permisos de la sala">
                <Settings2 className="w-4 h-4" />
              </button>
              <Badge color="yellow" className="hidden sm:flex"><Crown className="w-3 h-3" /> Host</Badge>
            </>
          )}
          <button onClick={() => setReportTarget({ type: 'room', id: roomId!, context: room.name, label: `la sala "${room.name}"` })}
            className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 text-[var(--text-muted)] hover:text-red-500 transition-colors"
            aria-label="Reportar sala" title="Reportar sala">
            <Flag className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-online" />
            <span className="text-xs text-[var(--text-muted)]">{onlineIds.length}</span>
          </div>
        </div>
      </header>

      {/* Solo se monta UN layout a la vez (desktop O mobile) para evitar dos
          reproductores simultáneos reproduciendo el mismo audio. */}
      {isDesktop ? (
        theater ? (
        /* ── Modo cine inmersivo: video full + widgets flotantes PiP (#3/#4) ── */
        <div className="flex-1 flex flex-col min-h-0 relative bg-black/[0.04] dark:bg-black/40">
          <div className="flex-1 min-h-0 flex items-center justify-center p-3 overflow-hidden">
            {/* Acota el ancho para que el alto 16:9 entre completo en el área disponible */}
            <div className="w-full mx-auto" style={{ maxWidth: 'calc((100dvh - 6rem) * 16 / 9)' }}>
              <StageWithReactions stageProps={stageProps} items={reactions.items} onReact={pickReaction} {...stageExtra} />
            </div>
          </div>

          {showChatW && (
            <FloatingWidget id="chat" title="Chat" width={300} bodyHeight={380} minWidth={240}
              sizePresets={[{ w: 260, h: 300 }, { w: 340, h: 420 }, { w: 440, h: 560 }]}
              accentClass="border-primary/30" onClose={() => setShowChatW(false)}
              icon={<MessageSquare className="w-3.5 h-3.5 text-primary shrink-0" />}
              defaultPos={{ x: Math.max(8, window.innerWidth - 320), y: 76 }}>
              <ChatPanel {...chatPanelProps} hideHeader />
            </FloatingWidget>
          )}
          {showCallW && (
            <FloatingWidget id="call" title="Llamada" width={232} bodyHeight={260} centerBody
              sizePresets={[{ w: 200, h: 210 }, { w: 264, h: 300 }, { w: 340, h: 400 }]}
              accentClass="border-secondary/40" onClose={() => setShowCallW(false)}
              icon={<Phone className="w-3.5 h-3.5 text-secondary shrink-0" />}
              defaultPos={{ x: 16, y: 76 }}>
              <div className="p-2 w-full"><VoicePanel {...voiceProps} /></div>
            </FloatingWidget>
          )}

          {/* Toolbar para reabrir widgets ocultos */}
          {(!showChatW || !showCallW) && (
            <div className="absolute bottom-3 right-3 flex gap-2 z-40">
              {!showCallW && (
                <button onClick={() => setShowCallW(true)} title="Mostrar llamada" aria-label="Mostrar llamada"
                  className="px-3 py-2 rounded-xl bg-surface dark:bg-dark-surface border border-[var(--border)] shadow-cine hover:border-secondary transition-colors flex items-center gap-1.5 text-xs font-semibold">
                  <Phone className="w-4 h-4 text-secondary" /> Llamada
                </button>
              )}
              {!showChatW && (
                <button onClick={() => setShowChatW(true)} title="Mostrar chat" aria-label="Mostrar chat"
                  className="px-3 py-2 rounded-xl bg-surface dark:bg-dark-surface border border-[var(--border)] shadow-cine hover:border-primary transition-colors flex items-center gap-1.5 text-xs font-semibold">
                  <MessageSquare className="w-4 h-4 text-primary" /> Chat
                </button>
              )}
            </div>
          )}
        </div>
        ) : (
        /* ── Layout normal de escritorio ── */
        <div className="flex-1 flex gap-4 p-4 min-h-0">
          {/* Columna principal: si el video + cola exceden el alto, scrollea ACÁ (no rompe el chat) */}
          <div className="flex-1 flex flex-col gap-4 min-w-0 min-h-0 overflow-y-auto">
            <StageWithReactions stageProps={stageProps} items={reactions.items} onReact={pickReaction} {...stageExtra} />
            <VideoQueue {...queueProps} />
          </div>
          {/* Columna lateral: participantes + voz arriba (alto natural, sin que el
              flex los comprima y recorte sus controles), chat con su scroll interno */}
          <div className="w-72 shrink-0 flex flex-col gap-4 min-h-0 overflow-y-auto">
            <div className="shrink-0"><ParticipantsPanel {...participantsProps} /></div>
            <div className="shrink-0"><VoicePanel {...voiceProps} /></div>
            <div className="flex-1 min-h-[16rem]"><ChatPanel {...chatPanelProps} /></div>
          </div>
        </div>
        )
      ) : theater ? (
        /* ── Modo cine móvil/tablet inmersivo (auto en horizontal) ── */
        <div className="flex-1 relative bg-black flex flex-col min-h-0">
          <div className="flex-1 min-h-0 flex items-center justify-center p-1 overflow-hidden">
            <div className="w-full mx-auto" style={{ maxWidth: 'min(100%, calc((100dvh - 6rem) * 16 / 9))' }}>
              <StageWithReactions stageProps={stageProps} items={reactions.items} onReact={pickReaction} hideBar {...stageExtra} />
            </div>
          </div>

          {/* Controles flotantes: reacciones + acceso a chat / sala */}
          <div className="absolute inset-x-0 bottom-3 z-40 flex items-center justify-center gap-2 px-3 pointer-events-none">
            <div className="pointer-events-auto"><ReactionBar onPick={pickReaction} compact /></div>
            <button onClick={() => setCineDrawer((d) => (d === 'chat' ? 'none' : 'chat'))}
              className={`pointer-events-auto relative w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 transition-colors
                ${cineDrawer === 'chat' ? 'bg-primary text-white' : 'bg-black/40 text-white hover:bg-black/60'}`}
              aria-label="Chat" title="Chat">
              <MessageSquare className="w-5 h-5" />
              {unreadChat > 0 && cineDrawer !== 'chat' && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-secondary text-white text-[10px] flex items-center justify-center font-bold">
                  {unreadChat > 9 ? '9+' : unreadChat}
                </span>
              )}
            </button>
            <button onClick={() => setCineDrawer((d) => (d === 'sala' ? 'none' : 'sala'))}
              className={`pointer-events-auto w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 transition-colors
                ${cineDrawer === 'sala' ? 'bg-primary text-white' : 'bg-black/40 text-white hover:bg-black/60'}`}
              aria-label="Sala" title="Participantes y videollamada">
              <Users className="w-5 h-5" />
            </button>
          </div>

          {/* Cajón inferior: chat o panel de sala (no rompe el video que sigue detrás) */}
          {cineDrawer !== 'none' && (
            <div className="absolute inset-x-0 bottom-0 z-50 h-[68%] bg-surface dark:bg-dark-surface rounded-t-3xl shadow-cine-lg flex flex-col animate-slide-up">
              <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
                <span className="font-bold text-sm">{cineDrawer === 'chat' ? 'Chat' : 'Sala'}</span>
                <button onClick={() => setCineDrawer('none')}
                  className="p-1.5 rounded-xl hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2 text-[var(--text-muted)] transition-colors"
                  aria-label="Cerrar">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {cineDrawer === 'chat' ? (
                <div className="flex-1 min-h-0 p-2"><ChatPanel {...chatPanelProps} /></div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
                  <ParticipantsPanel {...participantsProps} />
                  <VoicePanel {...voiceProps} />
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 min-h-0 flex flex-col">
          {mobileTab === 'video' && (
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
              {/* Acota el ANCHO del video para que su alto 16:9 entre completo en
                  cualquier orientación: full-width en vertical, letterbox en horizontal. */}
              <div className="mx-auto w-full" style={{ maxWidth: 'min(100%, calc((100dvh - 11rem) * 16 / 9))' }}>
                <StageWithReactions stageProps={stageProps} items={reactions.items} onReact={pickReaction} compactBar {...stageExtra} />
              </div>
              <VideoQueue {...queueProps} />
            </div>
          )}
          {mobileTab === 'chat' && (
            /* Llena por flex (sin alturas fijas mágicas) → el chat usa su scroll interno y nunca se corta */
            <div className="flex-1 min-h-0 p-3"><ChatPanel {...chatPanelProps} /></div>
          )}
          {mobileTab === 'sala' && (
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
              <ParticipantsPanel {...participantsProps} />
              <VoicePanel {...voiceProps} />
            </div>
          )}
        </div>
        <div className="shrink-0 border-t border-[var(--border)] bg-surface/95 dark:bg-dark-surface/95 backdrop-blur-sm flex">
          {([
            { key: 'video' as const, icon: <Play className="w-5 h-5" />,          label: 'Video' },
            { key: 'chat'  as const, icon: <MessageSquare className="w-5 h-5" />, label: 'Chat', badge: unreadChat },
            { key: 'sala'  as const, icon: <Users className="w-5 h-5" />,         label: 'Sala' },
          ]).map((t) => (
            <button key={t.key} onClick={() => setMobileTab(t.key)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-semibold transition-colors relative
                ${mobileTab === t.key ? 'text-primary' : 'text-[var(--text-muted)]'}`}>
              {t.icon}{t.label}
              {'badge' in t && (t.badge ?? 0) > 0 && mobileTab !== t.key && (
                <span className="absolute top-2 right-[calc(50%-14px)] min-w-4 h-4 px-1 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">
                  {(t.badge ?? 0) > 9 ? '9+' : t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Modal agregar video (multi-fuente) */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Agregar video">
        <form onSubmit={submitAddVideo} className="space-y-4">
          <div className="text-center"><LinkIcon className="w-12 h-12 text-primary mx-auto opacity-60" /></div>
          <Input label="Enlace del video" type="url" required autoFocus
            placeholder="YouTube, Vimeo, .m3u8 o .mp4…"
            value={addUrl} onChange={(e) => setAddUrl(e.target.value)} />
          {parsed && (
            <p className={`text-xs ${parsed.valid ? 'text-[var(--text-muted)]' : 'text-red-400'}`}>
              {parsed.valid ? `Detectado: ${parsed.label}` : parsed.error}
            </p>
          )}
          <Input label="Título (opcional)" placeholder="Nombre del video"
            value={addTitle} onChange={(e) => setAddTitle(e.target.value)} />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setAddOpen(false)} className="flex-1">Cancelar</Button>
            <Button type="submit" loading={adding} disabled={!parsed?.valid} className="flex-1">Agregar</Button>
          </div>
        </form>
      </Modal>

      {/* Modal permisos */}
      <Modal open={permsOpen} onClose={() => setPermsOpen(false)} title="Permisos de la sala">
        <PermissionsPanel permissions={permissions} onChange={savePermissions} />
      </Modal>

      {/* Modal invitar amigos (#5) */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invitar amigos">
        <InviteModal roomId={roomId!} roomCode={room.code} roomName={room.name} isHost={isHost} />
      </Modal>

      {/* Bandeja de solicitudes (Solo invitación) */}
      <Modal open={showRequests} onClose={() => setShowRequests(false)} title="Solicitudes de acceso">
        <JoinRequestsPanel requests={requests} onRespond={respondRequest} />
      </Modal>

      {/* Reportar contenido/conducta */}
      <ReportModal open={!!reportTarget} onClose={() => setReportTarget(null)} target={reportTarget} />

      {/* Modal de salida con llamada activa (#1) */}
      <Modal open={leaveOpen} onClose={() => setLeaveOpen(false)} title="¿Seguro que querés salir de la sala?">
        <div className="space-y-4">
          <div className="flex justify-center">
            <span className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <PhoneOff className="w-6 h-6 text-red-500" />
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)] text-center leading-relaxed">
            Estás conectado a una llamada de voz o video. Elegí cómo querés salir.
          </p>
          <div className="flex flex-col gap-2">
            <Button variant="danger" onClick={cutCallAndLeave} className="w-full">
              <PhoneOff className="w-4 h-4" /> Cortar llamada y salir
            </Button>
            <Button variant="secondary" onClick={leaveKeepCall} className="w-full">
              <Phone className="w-4 h-4" /> Salir y mantener la llamada
            </Button>
            <Button variant="ghost" onClick={() => setLeaveOpen(false)} className="w-full">
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Sugerencia "girar pantalla" — solo táctiles, vertical, fuera del modo cine. Discreta y descartable. */}
      {isTouch && !isLandscape && !theater && !rotateHintOff && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[4.75rem] z-40 flex items-center gap-2 max-w-[92vw]
          bg-dark-bg/90 dark:bg-dark-surface/95 text-white text-xs font-semibold pl-3 pr-1.5 py-1.5 rounded-full shadow-cine-lg backdrop-blur-sm animate-slide-up">
          <button onClick={() => setTheater(true)} className="flex items-center gap-1.5" aria-label="Activar modo cine">
            <RotateCw className="w-4 h-4 text-primary shrink-0" />
            Girá la pantalla para activar modo cine
          </button>
          <button onClick={dismissRotateHint} className="p-1 rounded-full hover:bg-white/15 transition-colors shrink-0" aria-label="Descartar sugerencia">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mini tutorial de bienvenida (onboarding) */}
      <OnboardingTour open={tourOpen} onClose={closeTour} />
    </div>
  );
}
