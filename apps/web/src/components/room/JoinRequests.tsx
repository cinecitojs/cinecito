// apps/web/src/components/room/JoinRequests.tsx
// UI de "Solo invitación":
//  - RequestAccessScreen: lo ve el SOLICITANTE (pedir acceso / esperando / rechazado).
//  - JoinRequestsPanel: la BANDEJA del host (aceptar / rechazar / ignorar), en tiempo real.

import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Clock, Check, X, EyeOff, Loader2, ArrowLeft, ShieldX, Inbox } from 'lucide-react';
import { Avatar, Button, Badge } from '../ui';

export type AccessState = 'ok' | 'request' | 'requested' | 'rejected';

export interface JoinRequest {
  roomId: string; userId: string; username: string; avatar: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'ignored';
  createdAt: number; updatedAt: number;
}

function fmtTime(ms: number) {
  const d = new Date(ms);
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

// ── Pantalla del solicitante ─────────────────────────────────
export function RequestAccessScreen({
  roomName, state, loading, onRequest,
}: {
  roomName?: string; state: AccessState; loading?: boolean; onRequest: () => void;
}) {
  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center px-4 text-center bg-[var(--bg)] dark:bg-dark-bg">
      <div className="w-full max-w-sm bg-surface dark:bg-dark-surface rounded-3xl border border-[var(--border)] shadow-cine p-8 animate-scale-in">
        {state === 'rejected' ? (
          <>
            <span className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <ShieldX className="w-7 h-7 text-red-500" />
            </span>
            <h1 className="font-display font-bold text-xl mb-1">Solicitud rechazada</h1>
            <p className="text-sm text-[var(--text-muted)]">El anfitrión no aprobó tu ingreso a esta sala.</p>
          </>
        ) : state === 'requested' ? (
          <>
            <span className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
            </span>
            <h1 className="font-display font-bold text-xl mb-1">Solicitud enviada al anfitrión</h1>
            <p className="text-sm text-[var(--text-muted)]">Esperando respuesta… Te dejamos entrar apenas la acepte.</p>
            <Badge color="yellow" className="mt-4">Pendiente</Badge>
          </>
        ) : (
          <>
            <img src="/pochi-wink.png?v=20260622" alt="" className="w-28 h-auto mx-auto mb-3 select-none" draggable={false} />
            <h1 className="font-display font-bold text-xl mb-1">Sala solo por invitación</h1>
            <p className="text-sm text-[var(--text-muted)] mb-5">
              {roomName ? <><span className="font-semibold text-[var(--text)]">{roomName}</span> requiere </> : 'Esta sala requiere '}
              la aprobación del anfitrión para entrar.
            </p>
            <Button onClick={onRequest} loading={loading} className="w-full">
              <Mail className="w-4 h-4" /> Solicitar acceso
            </Button>
          </>
        )}
        <Link to="/home" className="flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-primary mt-6 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio
        </Link>
      </div>
    </div>
  );
}

// ── Bandeja del host ─────────────────────────────────────────
function statusBadge(s: JoinRequest['status']) {
  if (s === 'accepted') return <Badge color="green">Aceptada</Badge>;
  if (s === 'rejected') return <Badge color="red">Rechazada</Badge>;
  if (s === 'ignored')  return <Badge color="yellow">Ignorada</Badge>;
  return <Badge color="blue">Pendiente</Badge>;
}

export function JoinRequestsPanel({
  requests, onRespond,
}: {
  requests: JoinRequest[];
  onRespond: (userId: string, action: 'accept' | 'reject' | 'ignore') => void;
}) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-[var(--text-muted)]">
        <Inbox className="w-10 h-10 opacity-40" />
        <p className="text-sm">No hay solicitudes pendientes.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
      {requests.map((r) => {
        const actionable = r.status === 'pending' || r.status === 'ignored';
        return (
          <div key={r.userId} className="flex items-center gap-3 p-3 rounded-2xl border border-[var(--border)]">
            <Avatar name={r.username} src={r.avatar} size="md" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{r.username}</p>
              <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                <Clock className="w-3 h-3" /> {fmtTime(r.createdAt)}
              </p>
            </div>
            {actionable ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => onRespond(r.userId, 'accept')} title="Aceptar" aria-label="Aceptar"
                  className="w-8 h-8 rounded-xl bg-[var(--success)]/15 text-[var(--success)] hover:bg-[var(--success)]/25 flex items-center justify-center transition-colors">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => onRespond(r.userId, 'reject')} title="Rechazar" aria-label="Rechazar"
                  className="w-8 h-8 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <button onClick={() => onRespond(r.userId, 'ignore')} title="Ignorar" aria-label="Ignorar"
                  className="w-8 h-8 rounded-xl bg-[var(--surface-2)] dark:bg-dark-surface2 text-[var(--text-muted)] hover:text-[var(--text)] flex items-center justify-center transition-colors">
                  <EyeOff className="w-4 h-4" />
                </button>
              </div>
            ) : statusBadge(r.status)}
          </div>
        );
      })}
    </div>
  );
}
