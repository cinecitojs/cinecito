// apps/web/src/components/room/index.tsx
// Subcomponentes de la sala. (El ChatPanel real vive en ChatPanel.tsx)

import React, { useState } from 'react';
import {
  Users, ListVideo, Crown, Plus, Trash2, Copy, Check,
  Youtube, Link as LinkIcon, Radio, Film, Settings2, Flag,
} from 'lucide-react';
import { Avatar, Badge } from '../ui';
import type { RoomPermissions } from '../../hooks/useSocket';

export { Avatar };

function sourceIcon(source: string) {
  switch (source) {
    case 'youtube': return <Youtube className="w-4 h-4 text-red-400" />;
    case 'vimeo':   return <Film className="w-4 h-4 text-sky-400" />;
    case 'hls':     return <Radio className="w-4 h-4 text-emerald-400" />;
    default:        return <LinkIcon className="w-4 h-4 text-primary" />;
  }
}

// ── PARTICIPANTS PANEL ───────────────────────────────────────
export function ParticipantsPanel({
  room, onlineUserIds, currentUserId, isHost, onTransferHost, onReportUser,
}: {
  room: any;
  onlineUserIds: string[];
  currentUserId?: string;
  isHost: boolean;
  onTransferHost: (uid: string) => void;
  onReportUser?: (user: { id: string; username: string }) => void;
}) {
  const onlineCount = onlineUserIds.length;

  const allMembers = [
    room.owner && {
      id: room.owner.id, username: room.owner.username, avatar: room.owner.avatar,
      isOwner: true, isCurrentHost: true,
    },
    ...(room.members || []).map((m: any) => ({
      id: m.userId, username: m.user?.username || m.displayName, avatar: m.user?.avatar,
      isOwner: false, isCurrentHost: m.isHost,
    })),
  ].filter(Boolean) as Array<{ id: string; username: string; avatar?: string; isOwner: boolean; isCurrentHost: boolean }>;

  const seen = new Set<string>();
  const members = allMembers.filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });

  return (
    <div className="bg-surface dark:bg-dark-surface rounded-3xl border border-[var(--border)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" />
        <span className="font-bold text-sm">Participantes</span>
        <span className="ml-auto flex items-center gap-1 text-xs">
          <span className="w-2 h-2 rounded-full bg-online" />
          <span className="text-[var(--text-muted)]">{onlineCount} online</span>
        </span>
      </div>
      <div className="p-2 space-y-1 max-h-52 overflow-y-auto">
        {members.map((m) => {
          const online = m.id ? onlineUserIds.includes(m.id) : false;
          const isMe   = m.id === currentUserId;
          return (
            <div key={m.id}
              className={`flex items-center gap-2.5 p-2 rounded-2xl transition-colors group
                ${isMe ? 'bg-primary/8' : 'hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2'}`}>
              <Avatar name={m.username} size="sm" online={online} src={m.avatar} />
              <span className="text-sm font-medium flex-1 truncate">
                {m.username}{isMe && <span className="text-primary text-xs ml-1">(tú)</span>}
              </span>
              {m.isCurrentHost && <Crown className="w-3.5 h-3.5 text-yellow-400 shrink-0" aria-label="Host" />}
              {isHost && !isMe && m.id && !m.isCurrentHost && (
                <button onClick={() => onTransferHost(m.id)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-primary hover:underline transition-opacity shrink-0">
                  Dar control
                </button>
              )}
              {onReportUser && !isMe && m.id && (
                <button onClick={() => onReportUser({ id: m.id, username: m.username })}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all shrink-0"
                  title={`Reportar a ${m.username}`} aria-label={`Reportar a ${m.username}`}>
                  <Flag className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── VIDEO QUEUE ──────────────────────────────────────────────
export function VideoQueue({
  videos, currentVideoId, canAdd, canRemove, canSelect, onSelect, onAddVideo, onRemove, onReportVideo,
}: {
  videos: any[];
  currentVideoId?: string | null;
  canAdd: boolean;
  canRemove: boolean;
  canSelect: boolean;
  onSelect: (id: string) => void;
  onAddVideo: () => void;
  onRemove: (id: string) => void;
  onReportVideo?: (video: { id: string; title?: string; url?: string }) => void;
}) {
  return (
    <div className="bg-surface dark:bg-dark-surface rounded-3xl border border-[var(--border)] overflow-hidden shrink-0">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
        <ListVideo className="w-4 h-4 text-primary" />
        <span className="font-bold text-sm">Cola de videos</span>
        {canAdd && (
          <button onClick={onAddVideo}
            className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-semibold"
            title="Agregar video">
            <Plus className="w-3.5 h-3.5" /> Agregar
          </button>
        )}
      </div>
      <div className="p-2 space-y-1 max-h-52 overflow-y-auto overscroll-contain">
        {videos.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] text-center py-6">
            {canAdd ? 'Agregá un video con el botón de arriba.' : 'Todavía no hay videos en la cola.'}
          </p>

        ) : (
          videos.map((v: any) => {
            const isCurrent = v.id === currentVideoId;
            return (
              <div key={v.id}
                className={`w-full flex items-center gap-2.5 p-2.5 rounded-2xl text-left transition-all group
                  ${isCurrent ? 'bg-primary/15 border border-primary/30'
                    : canSelect ? 'hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2' : ''}`}>
                <button onClick={() => canSelect && onSelect(v.id)} disabled={!canSelect}
                  className="flex items-center gap-2.5 min-w-0 flex-1 text-left disabled:cursor-default">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    {sourceIcon(v.source)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">{v.title || 'Sin título'}</p>
                    <p className="text-xs text-[var(--text-muted)] capitalize">{v.source}</p>
                  </div>
                </button>
                {isCurrent && <Badge color="blue" className="shrink-0">▶</Badge>}
                {onReportVideo && (
                  <button onClick={() => onReportVideo({ id: v.id, title: v.title, url: v.url })}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all shrink-0"
                    title="Reportar enlace" aria-label="Reportar enlace">
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                )}
                {canRemove && (
                  <button onClick={() => onRemove(v.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 transition-all shrink-0"
                    title="Eliminar">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── PERMISSIONS PANEL (solo host) ────────────────────────────
const PERM_LABELS: Record<keyof RoomPermissions, string> = {
  addVideo:    'Agregar videos',
  removeVideo: 'Eliminar videos',
  skip:        'Cambiar de video',
  pauseResume: 'Pausar / reanudar',
  seek:        'Adelantar / atrasar',
};

export function PermissionsPanel({
  permissions, onChange,
}: {
  permissions: RoomPermissions;
  onChange: (next: RoomPermissions) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <Settings2 className="w-4 h-4" />
        Quién puede hacer cada acción
      </div>
      {(Object.keys(PERM_LABELS) as Array<keyof RoomPermissions>).map((key) => (
        <div key={key} className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-[var(--surface-2)] dark:bg-dark-surface2">
          <span className="text-sm font-medium">{PERM_LABELS[key]}</span>
          <div className="flex rounded-xl overflow-hidden border border-[var(--border)] text-xs font-semibold">
            {(['host', 'everyone'] as const).map((val) => (
              <button key={val}
                onClick={() => onChange({ ...permissions, [key]: val })}
                className={`px-3 py-1.5 transition-colors ${permissions[key] === val
                  ? 'bg-primary text-white' : 'text-[var(--text-muted)] hover:bg-[var(--surface)] dark:hover:bg-dark-surface'}`}>
                {val === 'host' ? 'Host' : 'Todos'}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── INVITE BANNER ────────────────────────────────────────────
export function InviteBanner({ code, roomName }: { code: string; roomName: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/join?code=${code}`;
  const copy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[var(--surface-2)] dark:bg-dark-surface2 border border-[var(--border)]">
      <span className="font-mono text-sm font-bold text-primary tracking-wider">{code}</span>
      <span className="text-[var(--text-muted)] text-xs hidden sm:inline">·</span>
      <span className="text-xs text-[var(--text-muted)] hidden sm:inline truncate max-w-32">{roomName}</span>
      <button onClick={copy}
        className="ml-auto p-1 rounded-lg hover:bg-primary/10 text-[var(--text-muted)] hover:text-primary transition-colors shrink-0"
        title="Copiar link de invitación" aria-label="Copiar link de invitación">
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
