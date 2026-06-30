// apps/web/src/hooks/useSocket.ts  — FASE 3
// Agrega: typing events, callbacks tipados, cleanup mejorado
// REEMPLAZA el archivo de Fase 1

import { io, Socket } from 'socket.io-client';
import { useEffect, useRef, useCallback } from 'react';
import { SERVER_URL } from '../lib/serverUrl';

const SOCKET_URL = SERVER_URL;

export interface RoomSession {
  roomId: string;
  currentVideoId?: string | null;
  currentTime: number;
  isPlaying: boolean;
  version: number;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string | null;
  content: string;
  createdAt: string;
  user?: { id: string; username: string; avatar?: string | null } | null;
  reactions?: Record<string, string[]>; // emoji → userIds
}

export type RoomPermissions = Record<'addVideo' | 'removeVideo' | 'skip' | 'pauseResume' | 'seek', 'host' | 'everyone'>;

export interface RoomSettings {
  theme: string | null;
  chatEnabled: boolean;
  reactionsEnabled: boolean;
}

export interface JoinRoomResult {
  ok?: boolean;
  error?: string;
  message?: string;
  session: RoomSession | null;
  messages: ChatMessage[];
  onlineUserIds: string[];
  isHost: boolean;
  permissions?: RoomPermissions;
  settings?: RoomSettings;
  muted?: boolean;
  serverTime?: number;
}

interface UseSocketOptions {
  token?: string | null;
  onConnect?:    () => void;
  onDisconnect?: () => void;
  onError?:      (err: Error) => void;
}

export function useSocket({ token, onConnect, onDisconnect, onError }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    s.on('connect',       () => onConnect?.());
    s.on('disconnect',    () => onDisconnect?.());
    s.on('connect_error', (err) => onError?.(err));

    socketRef.current = s;

    // ✅ Cleanup correcto
    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  // ── Helpers ───────────────────────────────────────────────

  const joinRoom = useCallback((roomId: string): Promise<JoinRoomResult> =>
    new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) return reject(new Error('Socket not connected'));
      socketRef.current.emit('join-room', { roomId }, (result: JoinRoomResult) => {
        if (result.error) {
          const e: any = new Error(result.message || result.error);
          e.code = result.error;                 // p.ej. 'request_required' (solo invitación)
          e.roomName = (result as any).roomName;
          return reject(e);
        }
        resolve(result);
      });
    }), []);

  // ── Solicitudes de acceso (salas "Solo invitación") ──────
  const requestJoin = useCallback((roomId: string): Promise<{ ok?: boolean; status?: string; error?: string; message?: string }> =>
    new Promise((resolve) => {
      socketRef.current?.emit('request-join', { roomId }, (res: any) => resolve(res || {}));
    }), []);

  const listJoinRequests = useCallback((roomId: string): Promise<{ requests: any[]; pending: number }> =>
    new Promise((resolve) => {
      socketRef.current?.emit('list-join-requests', { roomId }, (res: any) =>
        resolve({ requests: res?.requests || [], pending: res?.pending || 0 }));
    }), []);

  const respondJoinRequest = useCallback((roomId: string, targetUserId: string, action: 'accept' | 'reject' | 'ignore'): Promise<{ ok?: boolean; error?: string }> =>
    new Promise((resolve) => {
      socketRef.current?.emit('respond-join-request', { roomId, userId: targetUserId, action }, (res: any) => resolve(res || {}));
    }), []);

  const leaveRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('leave-room', { roomId });
  }, []);

  const sendMessage = useCallback((roomId: string, content: string): Promise<void> =>
    new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) return reject(new Error('Not connected'));
      socketRef.current.emit('send-message', { roomId, content }, (result: any) => {
        if (result?.error) return reject(new Error(result.message));
        resolve();
      });
    }), []);

  // ── Reacciones ───────────────────────────────────────────
  const reactToMessage = useCallback((roomId: string, messageId: string, emoji: string) => {
    socketRef.current?.emit('message-reaction', { roomId, messageId, emoji });
  }, []);

  // ── Reacción flotante efímera (no se persiste) ───────────
  const sendReaction = useCallback((roomId: string, emoji: string) => {
    socketRef.current?.emit('room-reaction', { roomId, emoji });
  }, []);

  // ── Typing ───────────────────────────────────────────────
  const startTyping = useCallback((roomId: string) => {
    socketRef.current?.emit('typing-start', { roomId });
  }, []);

  const stopTyping = useCallback((roomId: string) => {
    socketRef.current?.emit('typing-stop', { roomId });
  }, []);

  // ── Video ────────────────────────────────────────────────
  const videoPlay   = useCallback((roomId: string, seekTime?: number) => {
    socketRef.current?.emit('video-play', { roomId, seekTime });
  }, []);

  const videoPause  = useCallback((roomId: string, seekTime?: number) => {
    socketRef.current?.emit('video-pause', { roomId, seekTime });
  }, []);

  const videoSeek   = useCallback((roomId: string, seekTime: number) => {
    socketRef.current?.emit('video-seek', { roomId, seekTime });
  }, []);

  const videoSelect = useCallback((roomId: string, videoId: string) => {
    socketRef.current?.emit('video-select', { roomId, videoId });
  }, []);

  const requestSync = useCallback((roomId: string): Promise<{ session: RoomSession | null; serverTime: number }> =>
    new Promise((resolve) => {
      if (!socketRef.current?.connected)
        return resolve({ session: null, serverTime: Date.now() });
      socketRef.current.emit('request-sync', { roomId }, (result: any) => {
        resolve({ session: result?.session || null, serverTime: result?.serverTime || Date.now() });
      });
    }), []);

  const updatePermissions = useCallback((roomId: string, permissions: RoomPermissions): Promise<RoomPermissions> =>
    new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) return reject(new Error('Not connected'));
      socketRef.current.emit('update-permissions', { roomId, permissions }, (result: any) => {
        if (result?.error) return reject(new Error(result.message));
        resolve(result.permissions);
      });
    }), []);

  const transferHost = useCallback((roomId: string, targetUserId: string): Promise<void> =>
    new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) return reject(new Error('Not connected'));
      socketRef.current.emit('transfer-host', { roomId, targetUserId }, (result: any) => {
        if (result?.error) return reject(new Error(result.message));
        resolve();
      });
    }), []);

  // ── Moderación / ajustes de sala (Fase 2) ────────────────
  const kickUser = useCallback((roomId: string, targetUserId: string, banMinutes?: number): Promise<{ ok?: boolean; error?: string; message?: string }> =>
    new Promise((resolve) => {
      socketRef.current?.emit('kick-user', { roomId, targetUserId, banMinutes }, (r: any) => resolve(r || {}));
    }), []);

  const muteUser = useCallback((roomId: string, targetUserId: string, muted: boolean): Promise<{ ok?: boolean; mutedUserIds?: string[]; error?: string }> =>
    new Promise((resolve) => {
      socketRef.current?.emit('mute-user', { roomId, targetUserId, muted }, (r: any) => resolve(r || {}));
    }), []);

  const deleteMessage = useCallback((roomId: string, messageId: string): Promise<{ ok?: boolean; error?: string }> =>
    new Promise((resolve) => {
      socketRef.current?.emit('delete-message', { roomId, messageId }, (r: any) => resolve(r || {}));
    }), []);

  const clearChat = useCallback((roomId: string): Promise<{ ok?: boolean; error?: string }> =>
    new Promise((resolve) => {
      socketRef.current?.emit('clear-chat', { roomId }, (r: any) => resolve(r || {}));
    }), []);

  const setRoomSettings = useCallback((roomId: string, patch: Partial<RoomSettings>): Promise<{ ok?: boolean; settings?: RoomSettings; error?: string }> =>
    new Promise((resolve) => {
      socketRef.current?.emit('set-room-settings', { roomId, ...patch }, (r: any) => resolve(r || {}));
    }), []);

  // ── Event listener helpers ────────────────────────────────
  const on = useCallback(<T = any>(event: string, handler: (data: T) => void) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  const off = useCallback((event: string, handler?: (...args: any[]) => void) => {
    socketRef.current?.off(event, handler);
  }, []);

  return {
    socket:    socketRef,
    joinRoom,
    leaveRoom,
    sendMessage,
    reactToMessage,
    sendReaction,
    requestJoin,
    listJoinRequests,
    respondJoinRequest,
    startTyping,
    stopTyping,
    videoPlay,
    videoPause,
    videoSeek,
    videoSelect,
    requestSync,
    transferHost,
    updatePermissions,
    kickUser,
    muteUser,
    deleteMessage,
    clearChat,
    setRoomSettings,
    on,
    off,
    isConnected: () => socketRef.current?.connected ?? false,
  };
}
