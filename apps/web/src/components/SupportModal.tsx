// apps/web/src/components/SupportModal.tsx
// Panel de apoyo: explica por qué apoyar + niveles + recompensas (cosméticas) y luego
// redirige a Ko-fi (nueva pestaña). HONESTO y voluntario: sin urgencia ni presión.
// El monto se elige en Ko-fi; las recompensas se conceden al confirmar el apoyo (webhook).
import React, { useEffect, useState } from 'react';
import { Heart, ExternalLink, Lock, Share2, Sparkles } from 'lucide-react';
import { Modal, Button } from './ui';
import { supportApi } from '../lib/api';
import { KOFI_URL, SUPPORT_TIERS, SUPPORT_CURRENCY, type SupportTier } from '../lib/support';
import { rewardOf } from '../lib/supporterRewards';
import { useAuthStore } from '../store/useAuthStore';
import Confetti from './Confetti';

type Phase = 'idle' | 'thanks';

export default function SupportModal({ open, onClose, tier }: { open: boolean; onClose: () => void; tier: SupportTier | null }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const [anon, setAnon] = useState(false);
  const { symbol } = SUPPORT_CURRENCY;

  useEffect(() => { if (open) { setPhase('idle'); setAnon(false); } }, [open, tier?.id]);

  const close = () => onClose();

  const goKofi = () => {
    window.open(KOFI_URL, '_blank', 'noopener,noreferrer');
    setPhase('thanks');
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
    <Modal open={open} onClose={close} title={phase === 'thanks' ? '¡Gracias! 💛' : 'Apoyar Cinecito'} size="sm">
      {phase === 'thanks' ? (
        // ── AGRADECIMIENTO ──
        <div className="space-y-4 text-center">
          <Confetti />
          <div className="flex justify-center">
            <img src={rewardOf(tier?.id)?.assets.pochi ?? '/pochi-wink.png'} alt="Pochi celebrando" draggable={false}
              className="w-28 h-auto select-none animate-pochi-cheer motion-reduce:animate-none" />
          </div>
          <div>
            <p className="font-display font-bold text-lg">¡Gracias por apoyar! 💛</p>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mt-1">
              Abrimos <span className="font-semibold text-[var(--text)]">Ko-fi</span> en otra pestaña. Cuando tu apoyo se confirme,
              se activan tus recompensas cosméticas. Pase lo que pase, Cinecito sigue gratis. 🐾
            </p>
          </div>

          <a href={KOFI_URL} target="_blank" rel="noopener noreferrer" className="block">
            <Button className="w-full"><ExternalLink className="w-4 h-4" /> Abrir Ko-fi de nuevo</Button>
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
            <img src="/pochi.png" alt="" className="w-12 h-auto select-none shrink-0" draggable={false} />
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
