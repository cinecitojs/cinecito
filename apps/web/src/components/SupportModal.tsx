// apps/web/src/components/SupportModal.tsx
// Panel de apoyo: explica por qué apoyar + niveles + recompensas (cosméticas) y luego
// redirige a Ko-fi (nueva pestaña). HONESTO y voluntario: sin urgencia ni presión.
// El monto se elige en Ko-fi; las recompensas se conceden al confirmar el apoyo (webhook).
//
// Flujo de estados (para usuarios con sesión):
//   idle → (Continuar a Ko-fi) → processing → thanks (webhook confirmó) | failed (timeout)
// "processing" y "failed" reflejan la CONFIRMACIÓN REAL: se sondea /support/me hasta
// detectar que el nivel de supporter subió (lo aplica el webhook de Ko-fi). Sin sesión
// no se puede verificar → se muestra el agradecimiento con la aclaración del email.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Heart, ExternalLink, Lock, Share2, Sparkles, Loader2, Clock } from 'lucide-react';
import { Modal, Button } from './ui';
import { supportApi } from '../lib/api';
import { KOFI_URL, SUPPORT_TIERS, SUPPORT_CURRENCY, type SupportTier } from '../lib/support';
import { rewardOf, rankOf } from '../lib/supporterRewards';
import { useAuthStore } from '../store/useAuthStore';
import Confetti from './Confetti';

type Phase = 'idle' | 'processing' | 'thanks' | 'failed';

const VERIFY_WINDOW_MS = 150_000; // 2.5 min sondeando la confirmación
const POLL_EVERY_MS = 4_000;

const TITLES: Record<Phase, string> = {
  idle: 'Apoyar Cinecito',
  processing: 'Procesando tu donación…',
  thanks: '¡Gracias! 💛',
  failed: 'Donación pendiente',
};

export default function SupportModal({ open, onClose, tier }: { open: boolean; onClose: () => void; tier: SupportTier | null }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const [anon, setAnon] = useState(false);
  const [checking, setChecking] = useState(false);
  const { symbol } = SUPPORT_CURRENCY;

  const pollRef = useRef<number | null>(null);
  const deadlineRef = useRef(0);
  const baselineRankRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current != null) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  // Reset al abrir; corta el sondeo al cerrar o desmontar.
  useEffect(() => {
    if (open) { setPhase('idle'); setAnon(false); }
    else stopPolling();
    return stopPolling;
  }, [open, tier?.id, stopPolling]);

  // Una verificación puntual: ¿el webhook ya confirmó (subió el nivel)?
  const verifyOnce = useCallback(async (): Promise<boolean> => {
    try {
      const { data } = await supportApi.me();
      if (rankOf(data?.supporter?.tier) > baselineRankRef.current) {
        stopPolling();
        setPhase('thanks');
        return true;
      }
    } catch { /* sin sesión o error transitorio → seguimos */ }
    return false;
  }, [stopPolling]);

  const startProcessing = useCallback(async () => {
    setPhase('processing');
    stopPolling();
    // Nivel actual ANTES de la donación (para detectar la subida que aplica el webhook).
    try { const { data } = await supportApi.me(); baselineRankRef.current = rankOf(data?.supporter?.tier); }
    catch { baselineRankRef.current = 0; }
    deadlineRef.current = Date.now() + VERIFY_WINDOW_MS;
    pollRef.current = window.setInterval(async () => {
      if (Date.now() > deadlineRef.current) { stopPolling(); setPhase('failed'); return; }
      await verifyOnce();
    }, POLL_EVERY_MS);
  }, [stopPolling, verifyOnce]);

  const manualCheck = useCallback(async () => {
    setChecking(true);
    const ok = await verifyOnce();
    setChecking(false);
    if (!ok) { deadlineRef.current = Date.now() + VERIFY_WINDOW_MS; setPhase('failed'); }
  }, [verifyOnce]);

  const close = () => { stopPolling(); onClose(); };

  const goKofi = () => {
    window.open(KOFI_URL, '_blank', 'noopener,noreferrer');
    if (isAuth) startProcessing();   // podemos verificar la confirmación real
    else setPhase('thanks');         // sin sesión: agradecemos y explicamos lo del email
  };

  // Compartir (Web Share API + fallback a X / WhatsApp).
  const shareText = '¡Estoy apoyando a Cinecito! 🍿 Un cine privado para ver con amigos.';
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/apoyar` : 'https://cinecito';
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
  const share = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try { await (navigator as any).share({ title: 'Cinecito', text: shareText, url: shareUrl }); } catch { /* cancelado */ }
    } else { window.open(twitterUrl, '_blank', 'noopener'); }
  };
  const toggleAnon = async (v: boolean) => {
    setAnon(v);
    try { await supportApi.updateMe({ anonymous: v }); } catch { /* best-effort, requiere sesión */ }
  };

  return (
    <Modal open={open} onClose={close} title={TITLES[phase]} size="sm">
      {phase === 'processing' ? (
        // ── PROCESANDO (esperando confirmación del webhook) ──
        <div className="space-y-4 text-center">
          <div className="flex justify-center"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
          <div>
            <p className="font-display font-bold text-lg">Procesando tu donación…</p>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mt-1">
              Completá tu apoyo en la pestaña de <span className="font-semibold text-[var(--text)]">Ko-fi</span>.
              En cuanto se confirme, activamos tus recompensas. Puede tardar hasta un minuto.
            </p>
          </div>
          <a href={KOFI_URL} target="_blank" rel="noopener noreferrer" className="block">
            <Button variant="secondary" className="w-full"><ExternalLink className="w-4 h-4" /> Volver a abrir Ko-fi</Button>
          </a>
          <Button onClick={manualCheck} loading={checking} className="w-full">Ya doné — verificar ahora</Button>
          <p className="text-[11px] text-[var(--text-muted)]">Podés cerrar tranquilo: tus recompensas se activan igual cuando Ko-fi confirme.</p>
          <button onClick={close} className="text-xs text-[var(--text-muted)] hover:text-primary">Cerrar</button>
        </div>
      ) : phase === 'failed' ? (
        // ── NO RECIBIDA (todavía) ──
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <span className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-7 h-7 text-amber-500" />
            </span>
          </div>
          <div>
            <p className="font-display font-bold text-lg">Todavía no recibimos tu donación</p>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mt-1">Tranqui, no se perdió nada.</p>
          </div>
          <ul className="text-left text-xs text-[var(--text-muted)] space-y-1.5 bg-[var(--surface-2)]/60 dark:bg-dark-surface2/60 rounded-2xl p-3">
            <li>• La confirmación de Ko-fi puede tardar unos minutos.</li>
            <li>• Usá el <span className="font-semibold text-[var(--text)]">mismo email</span> en Ko-fi y en Cinecito para que se asignen las recompensas.</li>
            <li>• Si cancelaste el pago, no se te cobró nada.</li>
          </ul>
          <div className="flex gap-2">
            <a href={KOFI_URL} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button variant="secondary" className="w-full"><ExternalLink className="w-4 h-4" /> Abrir Ko-fi</Button>
            </a>
            <Button onClick={startProcessing} loading={checking} className="flex-1">Reintentar</Button>
          </div>
          <button onClick={close} className="text-xs text-[var(--text-muted)] hover:text-primary">Cerrar</button>
        </div>
      ) : phase === 'thanks' ? (
        // ── AGRADECIMIENTO ──
        <div className="space-y-4 text-center">
          <Confetti />
          <div className="flex justify-center">
            <img src={rewardOf(tier?.id)?.assets.pochi ?? '/pochi-wink.png?v=20260622'} alt="Pochi celebrando" draggable={false}
              className="w-28 h-auto select-none animate-pochi-cheer motion-reduce:animate-none" />
          </div>
          <div>
            <p className="font-display font-bold text-lg">¡Gracias por apoyar! 💛</p>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mt-1">
              {isAuth
                ? '¡Tu apoyo se confirmó y tus recompensas cosméticas ya están activas! Pase lo que pase, Cinecito sigue gratis. 🐾'
                : 'Abrimos Ko-fi en otra pestaña. Para activar tus recompensas, iniciá sesión en Cinecito con el mismo email de tu donación. Cinecito siempre es gratis. 🐾'}
            </p>
          </div>

          <a href={KOFI_URL} target="_blank" rel="noopener noreferrer" className="block">
            <Button variant="secondary" className="w-full"><ExternalLink className="w-4 h-4" /> Abrir Ko-fi de nuevo</Button>
          </a>

          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">Si te gusta, contalo (opcional)</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Button size="sm" variant="secondary" onClick={share}><Share2 className="w-4 h-4" /> Compartir</Button>
              <a href={twitterUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl border border-[var(--border)] text-xs font-semibold hover:border-primary hover:text-primary transition-colors">X / Twitter</a>
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl border border-[var(--border)] text-xs font-semibold hover:border-primary hover:text-primary transition-colors">WhatsApp</a>
            </div>
          </div>

          {isAuth && (
            <label className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer">
              <input type="checkbox" checked={anon} onChange={(e) => toggleAnon(e.target.checked)} className="accent-primary w-3.5 h-3.5" />
              Prefiero permanecer anónimo en el muro de agradecimientos
            </label>
          )}

          <button onClick={close} className="text-xs text-[var(--text-muted)] hover:text-primary">Cerrar</button>
        </div>
      ) : (
        // ── INFORMACIÓN + REDIRECCIÓN ──
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <img src="/pochi.png?v=20260622" alt="" className="w-12 h-auto select-none shrink-0" draggable={false} />
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Tu apoyo ayuda a pagar <span className="font-semibold text-[var(--text)]">hosting, mantenimiento y nuevas funciones</span>.
              Es 100% voluntario y elegís el monto en Ko-fi.
            </p>
          </div>

          {/* Niveles + recompensas */}
          <div className="space-y-2">
            {SUPPORT_TIERS.map((t) => {
              const Icon = t.icon;
              const focus = tier?.id === t.id;
              return (
                <div key={t.id}
                  className={`rounded-2xl border-2 p-3 transition-colors ${focus ? `${t.ring} bg-[var(--surface-2)]/60 dark:bg-dark-surface2/60` : 'border-[var(--border)]'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-xl bg-[var(--surface-2)] dark:bg-dark-surface2 flex items-center justify-center ${t.accent}`}><Icon className="w-4 h-4" /></span>
                    <span className="font-bold text-sm flex-1">{t.name}</span>
                    <span className="text-xs text-[var(--text-muted)]">desde {symbol}{t.suggested}</span>
                  </div>
                  <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 pl-9">
                    {t.perks.map((p) => (
                      <li key={p} className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                        <Sparkles className={`w-3 h-3 ${t.accent}`} /> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Transparencia */}
          <p className="text-[11px] text-[var(--text-muted)] flex items-start gap-1.5 leading-relaxed">
            <Lock className="w-3 h-3 mt-0.5 shrink-0" /> Aporte voluntario. No es una compra ni desbloquea funciones; las recompensas son solo visuales. Cinecito siempre será gratis.
          </p>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={close} className="flex-1">Quizás luego</Button>
            <Button onClick={goKofi} className="flex-1 sheen-host">
              <Heart className="w-4 h-4 fill-white/80" /> Continuar a Ko-fi
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
