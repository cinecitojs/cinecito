// apps/web/src/components/room/InviteModal.tsx
// "Invitar amigos": link único + código, copiar, Web Share, QR, y gestión
// del host (crear con expiración/límite de usos, listar, revocar).

import React, { useState, useEffect, useCallback, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Copy, Check, Share2, QrCode, Link as LinkIcon, Trash2, Plus, RefreshCw, Clock, Hash,
} from 'lucide-react';
import { roomsApi } from '../../lib/api';
import { Button, Input, toast } from '../ui';

interface Invite {
  code: string; roomId: string; expiresAt: number | null;
  maxUses: number | null; uses: number; revoked: boolean; createdAt: number;
}

function inviteValid(i: Invite): boolean {
  if (i.revoked) return false;
  if (i.expiresAt && Date.now() > i.expiresAt) return false;
  if (i.maxUses != null && i.uses >= i.maxUses) return false;
  return true;
}

function fmtExpiry(i: Invite): string {
  if (!i.expiresAt) return 'sin vencimiento';
  const ms = i.expiresAt - Date.now();
  if (ms <= 0) return 'vencida';
  const h = Math.floor(ms / 3_600_000);
  return h >= 1 ? `vence en ${h} h` : `vence en ${Math.max(1, Math.floor(ms / 60_000))} min`;
}

export default function InviteModal({
  roomId, roomCode, roomName, isHost,
}: {
  roomId: string; roomCode: string; roomName: string; isHost: boolean;
}) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [active, setActive]   = useState<string>('');   // código activo a compartir
  const [creating, setCreating] = useState(false);
  const [ttlHours, setTtlHours] = useState('');
  const [maxUses, setMaxUses]   = useState('');
  const [copied, setCopied]   = useState<'link' | 'code' | null>(null);
  const [qr, setQr]           = useState('');
  const [showOpts, setShowOpts] = useState(false);

  // El link compartido: invite (host) o código de sala (fallback).
  const activeCode = active || (isHost ? '' : roomCode);
  const link = activeCode
    ? `${window.location.origin}/invite/${activeCode}`
    : `${window.location.origin}/join?code=${roomCode}`;
  const shareCode = activeCode || roomCode;

  const loadInvites = useCallback(async () => {
    if (!isHost) return;
    try {
      const { data } = await roomsApi.listInvites(roomId);
      const list: Invite[] = data.invites || [];
      setInvites(list);
      const firstValid = list.find(inviteValid);
      if (firstValid) setActive(firstValid.code);
    } catch { /* sin permisos */ }
  }, [isHost, roomId]);

  const createNew = useCallback(async () => {
    setCreating(true);
    try {
      const { data } = await roomsApi.createInvite(roomId, {
        ttlHours: ttlHours ? Number(ttlHours) : undefined,
        maxUses: maxUses ? Number(maxUses) : undefined,
      });
      setInvites((p) => [data.invite, ...p]);
      setActive(data.invite.code);
      setShowOpts(false); setTtlHours(''); setMaxUses('');
      toast('Enlace de invitación creado', 'success');
    } catch { toast('No se pudo crear la invitación', 'error'); }
    finally { setCreating(false); }
  }, [roomId, ttlHours, maxUses]);

  // Guardia de idempotencia: evita el DOBLE auto-create por el doble montaje de
  // efectos de React.StrictMode (y reaperturas). Se inicializa una sola vez por sala.
  const initedRef = useRef<string | null>(null);

  // Carga inicial: lista invitaciones; si el host no tiene ninguna válida, crea UNA.
  useEffect(() => {
    if (!isHost) return;
    if (initedRef.current === roomId) return;   // ya inicializado para esta sala
    initedRef.current = roomId;                 // marcar ANTES del await (síncrono) → bloquea el 2º montaje
    (async () => {
      const { data } = await roomsApi.listInvites(roomId).catch(() => ({ data: { invites: [] } } as any));
      const list: Invite[] = data.invites || [];
      setInvites(list);
      const firstValid = list.find(inviteValid);
      if (firstValid) setActive(firstValid.code);
      else { try { await createNew(); } catch { /* */ } }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, roomId]);

  // Generar el QR del link activo.
  useEffect(() => {
    QRCode.toDataURL(link, { width: 220, margin: 1, color: { dark: '#1D6FA8', light: '#FFFFFF' } })
      .then(setQr).catch(() => setQr(''));
  }, [link]);

  const copy = (what: 'link' | 'code') => {
    navigator.clipboard.writeText(what === 'link' ? link : shareCode);
    setCopied(what);
    setTimeout(() => setCopied(null), 2000);
    toast(what === 'link' ? 'Enlace copiado' : 'Código copiado', 'success');
  };

  const webShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: `Cinecito — ${roomName}`, text: `Unite a mi sala "${roomName}" en Cinecito`, url: link }); }
      catch { /* cancelado */ }
    } else { copy('link'); }
  };

  const revoke = async (code: string) => {
    try {
      await roomsApi.revokeInvite(roomId, code);
      setInvites((p) => p.map((i) => i.code === code ? { ...i, revoked: true } : i));
      if (active === code) setActive('');
      toast('Invitación revocada', 'info');
    } catch { toast('No se pudo revocar', 'error'); }
  };

  return (
    <div className="space-y-4">
      {/* QR */}
      <div className="flex justify-center">
        {qr
          ? <img src={qr} alt="Código QR de invitación" className="w-40 h-40 rounded-2xl border border-[var(--border)] bg-white p-1" />
          : <div className="w-40 h-40 rounded-2xl bg-[var(--surface-2)] dark:bg-dark-surface2 flex items-center justify-center"><QrCode className="w-8 h-8 opacity-30" /></div>}
      </div>

      {/* Link */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-[var(--surface-2)] dark:bg-dark-surface2 border border-[var(--border)]">
        <LinkIcon className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
        <span className="text-xs truncate flex-1 font-mono">{link}</span>
        <button onClick={() => copy('link')} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors shrink-0" title="Copiar enlace" aria-label="Copiar enlace">
          {copied === 'link' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* Acciones */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => copy('code')} className="flex flex-col items-center gap-1 py-2.5 rounded-2xl border border-[var(--border)] hover:border-primary transition-colors text-xs font-semibold">
          {copied === 'code' ? <Check className="w-4 h-4 text-green-500" /> : <Hash className="w-4 h-4 text-primary" />}
          Copiar código
        </button>
        <button onClick={webShare} className="flex flex-col items-center gap-1 py-2.5 rounded-2xl border border-[var(--border)] hover:border-primary transition-colors text-xs font-semibold">
          <Share2 className="w-4 h-4 text-primary" /> Compartir
        </button>
        <div className="flex flex-col items-center gap-1 py-2.5 rounded-2xl bg-[var(--surface-2)] dark:bg-dark-surface2 text-xs font-semibold">
          <span className="font-mono text-primary tracking-wider">{shareCode}</span>
          <span className="text-[var(--text-muted)] text-[10px]">código</span>
        </div>
      </div>

      {/* Gestión (solo host) */}
      {isHost && (
        <div className="pt-2 border-t border-[var(--border)] space-y-2">
          <button onClick={() => setShowOpts((s) => !s)} className="flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)] hover:text-primary transition-colors">
            <Plus className="w-4 h-4" /> Nuevo enlace con opciones
          </button>
          {showOpts && (
            <div className="space-y-2 p-3 rounded-2xl bg-[var(--surface-2)] dark:bg-dark-surface2">
              <div className="grid grid-cols-2 gap-2">
                <Input label="Vence en (horas)" type="number" min={1} placeholder="∞" value={ttlHours} onChange={(e) => setTtlHours(e.target.value)} />
                <Input label="Máx. usos" type="number" min={1} placeholder="∞" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
              </div>
              <Button onClick={createNew} loading={creating} className="w-full" size="sm"><RefreshCw className="w-4 h-4" /> Generar enlace</Button>
            </div>
          )}

          {invites.filter((i) => !i.revoked).length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {invites.filter((i) => !i.revoked).map((i) => (
                <div key={i.code}
                  className={`flex items-center gap-2 p-2 rounded-xl text-xs ${active === i.code ? 'bg-primary/10' : 'hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2'}`}>
                  <button onClick={() => setActive(i.code)} className="flex-1 flex items-center gap-2 text-left min-w-0">
                    <span className="font-mono font-bold text-primary">{i.code}</span>
                    <span className="text-[var(--text-muted)] truncate flex items-center gap-1">
                      <Clock className="w-3 h-3" />{fmtExpiry(i)}
                      {i.maxUses != null && <> · {i.uses}/{i.maxUses}</>}
                    </span>
                  </button>
                  {!inviteValid(i) && <span className="text-[10px] text-red-400">inválida</span>}
                  <button onClick={() => revoke(i.code)} className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 shrink-0" title="Revocar" aria-label="Revocar invitación">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
