// apps/web/src/components/room/ChatPanel.tsx  — FASE 3
// Chat completo: scroll infinito, typing, emojis, mensajes del sistema

import React, {
  useState, useRef, useEffect, useCallback,
} from 'react';
import { Send, Loader2, ArrowDown, MessageSquare, SmilePlus, Flag, Trash2, BellOff } from 'lucide-react';
import { messagesApi } from '../../lib/api';
import { Avatar } from '../ui';
import EmojiPicker from './EmojiPicker';
import { useTyping } from '../../hooks/useTyping';
import type { ChatMessage } from '../../hooks/useSocket';

interface ChatPanelProps {
  roomId: string;
  messages: ChatMessage[];
  typingUserIds: string[];
  onSend: (content: string) => Promise<void>;
  onLoadMore: (before: string) => Promise<boolean>; // devuelve hasMore
  currentUserId?: string;
  onlineUsers?: Array<{ id: string; username: string }>;
  onStartTyping: (roomId: string) => void;
  onStopTyping:  (roomId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  /** Reportar un mensaje (de otro usuario). */
  onReportMessage?: (msg: ChatMessage) => void;
  /** Oculta el header interno (cuando el chat va dentro de un FloatingWidget que ya tiene su barra). */
  hideHeader?: boolean;
  /** Chat bloqueado (silenciado o desactivado por el host): deshabilita el input. */
  disabled?: boolean;
  disabledReason?: string;
  /** El usuario actual es host: puede borrar cualquier mensaje. */
  canModerate?: boolean;
  onDeleteMessage?: (id: string) => void;
}

const QUICK_REACTIONS = ['🔥', '❤️', '😂', '👍', '😮', '🎬'];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparator(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Hoy';
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
}

// Agrupa mensajes consecutivos del mismo usuario (dentro de 2 minutos)
function groupMessages(messages: ChatMessage[]) {
  type Group = {
    key: string;
    userId: string | null;
    username: string;
    avatar?: string | null;
    isSystem: boolean;
    items: ChatMessage[];
    dateSeparator?: string;
  };

  const groups: Group[] = [];
  let lastDate = '';

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const isSystem = !msg.userId;
    const username = msg.user?.username || 'Invitado';

    // Separador de fecha
    const msgDate = new Date(msg.createdAt).toDateString();
    const showDate = msgDate !== lastDate;
    lastDate = msgDate;

    const prev = groups[groups.length - 1];
    const prevMsg = prev?.items[prev.items.length - 1];
    const sameUser = prev && !isSystem && !prev.isSystem && prev.userId === msg.userId;
    const within2min = prevMsg
      && (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) < 120_000;

    if (!showDate && sameUser && within2min) {
      prev.items.push(msg);
    } else {
      groups.push({
        key: msg.id,
        userId: msg.userId,
        username,
        avatar: msg.user?.avatar,
        isSystem,
        items: [msg],
        dateSeparator: showDate ? formatDateSeparator(msg.createdAt) : undefined,
      });
    }
  }

  return groups;
}

export default function ChatPanel({
  roomId,
  messages,
  typingUserIds,
  onSend,
  onLoadMore,
  currentUserId,
  onlineUsers = [],
  onStartTyping,
  onStopTyping,
  onReact,
  onReportMessage,
  hideHeader = false,
  disabled = false,
  disabledReason,
  canModerate = false,
  onDeleteMessage,
}: ChatPanelProps) {
  const [input, setInput]         = useState('');
  const [reactingId, setReactingId] = useState<string | null>(null);
  const [sending, setSending]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]     = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [newCount, setNewCount]   = useState(0); // mensajes nuevos mientras leés arriba

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const atBottomRef  = useRef(true);
  const prevLastId   = useRef<string | undefined>(undefined);

  const { handleInput: typingInput, handleSend: typingSend, cleanup: typingCleanup } = useTyping({
    roomId,
    onStartTyping,
    onStopTyping,
    delay: 2000,
  });

  // Cleanup typing al desmontar
  useEffect(() => () => typingCleanup(), []);

  // Auto-scroll INTELIGENTE: si estás al fondo, baja solo; si estás leyendo
  // arriba, no mueve el scroll y cuenta los mensajes nuevos para el pill.
  useEffect(() => {
    const lastId = messages[messages.length - 1]?.id;
    const isNewAppended = lastId !== prevLastId.current && prevLastId.current !== undefined;
    const firstLoad = prevLastId.current === undefined;
    prevLastId.current = lastId;

    if (atBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: firstLoad ? 'auto' : 'smooth' });
      setNewCount(0);
    } else if (isNewAppended) {
      // No contar cargas de historial (prepend): solo mensajes nuevos al final.
      setNewCount((c) => c + 1);
    }
  }, [messages]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    atBottomRef.current = atBottom;
    setShowScrollBtn(!atBottom);
    if (atBottom) setNewCount(0);

    // Scroll infinito: cargar más cuando se llega al tope
    if (el.scrollTop < 60 && hasMore && !loadingMore && messages.length > 0) {
      const oldest = messages[0];
      setLoadingMore(true);
      const prevScrollHeight = el.scrollHeight;
      onLoadMore(oldest.createdAt).then((more) => {
        setHasMore(more);
        // Mantener la posición de scroll después de cargar
        requestAnimationFrame(() => {
          if (el) {
            el.scrollTop = el.scrollHeight - prevScrollHeight;
          }
        });
      }).finally(() => setLoadingMore(false));
    }
  }, [messages, hasMore, loadingMore, onLoadMore]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setNewCount(0);
    atBottomRef.current = true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending || disabled) return;
    setSending(true);
    setInput('');
    typingSend();
    try {
      await onSend(content);
    } catch {
      setInput(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    typingInput();
  };

  const insertEmoji = (emoji: string) => {
    setInput((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const groups = groupMessages(messages);

  // Nombres de usuarios que están escribiendo (filtrar el propio)
  const typingNames = onlineUsers
    .filter((u) => typingUserIds.includes(u.id) && u.id !== currentUserId)
    .map((u) => u.username);

  return (
    <div className="flex flex-col h-full bg-surface dark:bg-dark-surface rounded-3xl border border-[var(--border)] overflow-hidden relative">
      {/* ── Header ─────────────────────────────────────────── */}
      {!hideHeader && (
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2 shrink-0">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="font-display font-semibold text-sm">Chat</span>
          {messages.length > 0 && (
            <span className="ml-auto text-xs text-[var(--text-muted)] tabular-nums">{messages.length}</span>
          )}
        </div>
      )}

      {/* ── Indicador de carga histórico ────────────────────── */}
      {loadingMore && (
        <div className="flex justify-center py-2 shrink-0">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        </div>
      )}

      {/* ── Área de mensajes ────────────────────────────────── */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 min-h-0"
      >
        {/* Fin del historial */}
        {!hasMore && messages.length > 0 && (
          <div className="flex justify-center py-2">
            <span className="text-xs text-[var(--text-muted)] bg-[var(--surface-2)] dark:bg-dark-surface2 px-3 py-1 rounded-full">
              Inicio del historial
            </span>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-muted)] py-8">
            <span className="text-4xl">💬</span>
            <p className="text-xs text-center leading-relaxed">
              Sin mensajes aún.<br />¡Sé el primero en escribir!
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.key} className="animate-msg-in">
              {/* Separador de fecha */}
              {group.dateSeparator && (
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <span className="text-xs text-[var(--text-muted)] font-medium px-2">
                    {group.dateSeparator}
                  </span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>
              )}

              {/* Mensaje del sistema */}
              {group.isSystem ? (
                <div className="flex justify-center my-1.5">
                  <span className="text-xs text-[var(--text-muted)] bg-[var(--surface-2)] dark:bg-dark-surface2 px-3 py-1 rounded-full">
                    {group.items[0].content}
                  </span>
                </div>
              ) : (
                /* Grupo de mensajes del mismo usuario */
                <div className={`flex gap-2 mb-1.5 ${group.userId === currentUserId ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar (solo para el primero del grupo) */}
                  {group.userId !== currentUserId && (
                    <Avatar name={group.username} size="xs" src={group.avatar} className="mt-0.5 shrink-0" />
                  )}

                  <div className={`flex flex-col max-w-[75%] ${group.userId === currentUserId ? 'items-end' : 'items-start'} gap-0.5`}>
                    {/* Nombre (solo mensajes de otros) */}
                    {group.userId !== currentUserId && (
                      <span className="text-xs font-semibold text-[var(--text-muted)] px-1">
                        {group.username}
                      </span>
                    )}

                    {/* Burbujas + reacciones */}
                    {group.items.map((msg, idx) => {
                      const isOwn   = msg.userId === currentUserId;
                      const isFirst = idx === 0;
                      const isLast  = idx === group.items.length - 1;
                      const reactions = msg.reactions || {};
                      const reactionEntries = Object.entries(reactions).filter(([, u]) => u.length > 0);
                      return (
                        <div key={msg.id} className={`group/msg flex flex-col ${isOwn ? 'items-end' : 'items-start'} gap-1 max-w-full`}>
                          <div className={`flex items-center gap-1 max-w-full ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div
                              className={`px-3 py-2 text-sm leading-relaxed break-words min-w-0
                                ${isOwn
                                  ? `bg-primary text-white ${isFirst && isLast ? 'rounded-2xl' : isFirst ? 'rounded-2xl rounded-br-sm' : isLast ? 'rounded-2xl rounded-tr-sm' : 'rounded-lg'}`
                                  : `bg-[var(--surface-2)] dark:bg-dark-surface2 ${isFirst && isLast ? 'rounded-2xl' : isFirst ? 'rounded-2xl rounded-bl-sm' : isLast ? 'rounded-2xl rounded-tl-sm' : 'rounded-lg'}`
                                }`}>
                              {msg.content}
                            </div>
                            {onReact && (
                              <button type="button" aria-label="Reaccionar" title="Reaccionar"
                                onClick={() => setReactingId((id) => id === msg.id ? null : msg.id)}
                                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-muted)] opacity-50 hover:opacity-100 hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2 transition-opacity">
                                <SmilePlus className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onReportMessage && !isOwn && (
                              <button type="button" aria-label="Reportar mensaje" title="Reportar mensaje"
                                onClick={() => onReportMessage(msg)}
                                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-muted)] opacity-0 group-hover/msg:opacity-60 hover:!opacity-100 hover:text-red-500 hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2 transition-all">
                                <Flag className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canModerate && onDeleteMessage && (
                              <button type="button" aria-label="Borrar mensaje" title="Borrar mensaje (host)"
                                onClick={() => onDeleteMessage(msg.id)}
                                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-muted)] opacity-0 group-hover/msg:opacity-60 hover:!opacity-100 hover:text-red-500 hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2 transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Fila rápida de reacciones */}
                          {onReact && reactingId === msg.id && (
                            <div className="flex gap-0.5 bg-surface dark:bg-dark-surface border border-[var(--border)] rounded-full px-1.5 py-1 shadow-cine animate-scale-in">
                              {QUICK_REACTIONS.map((e) => (
                                <button key={e} type="button"
                                  onClick={() => { onReact(msg.id, e); setReactingId(null); }}
                                  className="text-base leading-none px-1 hover:scale-125 transition-transform">
                                  {e}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Chips de reacciones */}
                          {reactionEntries.length > 0 && (
                            <div className={`flex flex-wrap gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                              {reactionEntries.map(([emoji, users]) => {
                                const mine = !!currentUserId && users.includes(currentUserId);
                                return (
                                  <button key={emoji} type="button" disabled={!onReact}
                                    onClick={() => onReact?.(msg.id, emoji)}
                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors
                                      ${mine ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-[var(--surface-2)] dark:bg-dark-surface2 border-transparent text-[var(--text-muted)] hover:border-[var(--border)]'}`}>
                                    <span>{emoji}</span><span className="tabular-nums">{users.length}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Timestamp del último */}
                    <span className="text-xs text-[var(--text-muted)] px-1">
                      {formatTime(group.items[group.items.length - 1].createdAt)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Typing indicator ────────────────────────────────── */}
      {typingNames.length > 0 && (
        <div className="px-4 py-1.5 shrink-0 flex items-center gap-2">
          <div className="flex gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            {typingNames.length === 1
              ? `${typingNames[0]} está escribiendo...`
              : `${typingNames.slice(0, 2).join(', ')} están escribiendo...`
            }
          </span>
        </div>
      )}

      {/* ── Nuevos mensajes / ir al final ────────────────────── */}
      {(newCount > 0 || showScrollBtn) && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-[4.75rem] left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-white text-xs font-semibold shadow-cine hover:bg-primary-dark transition-all animate-scale-in"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          {newCount > 0 ? `${newCount} mensaje${newCount > 1 ? 's' : ''} nuevo${newCount > 1 ? 's' : ''}` : 'Ir al final'}
        </button>
      )}

      {/* ── Input (o aviso si está bloqueado) ───────────────── */}
      {disabled ? (
        <div className="p-3 border-t border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--surface-2)] dark:bg-dark-surface2 text-[var(--text-muted)] text-sm">
            <BellOff className="w-4 h-4 shrink-0" />
            <span className="truncate">{disabledReason || 'No podés escribir en este momento.'}</span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-3 border-t border-[var(--border)] flex gap-1.5 items-center shrink-0">
          <EmojiPicker onSelect={insertEmoji} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Escribí un mensaje…"
            value={input}
            onChange={handleInputChange}
            maxLength={500}
            className="flex-1 px-4 py-2.5 rounded-2xl border border-[var(--border)] bg-[var(--bg)] dark:bg-dark-surface2 text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all min-w-0"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            aria-label="Enviar"
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary-dark transition-all disabled:opacity-40 shrink-0 active:scale-90 glow-primary"
          >
            {sending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </button>
        </form>
      )}
    </div>
  );
}
