// apps/web/src/components/SupporterPanel.tsx
// Sección "Apoyo y recompensas" para Ajustes. Muestra el estado de supporter y aplica
// las recompensas COSMÉTICAS (insignia, marco, fondo, efectos), el selector de tema de
// sala (bloqueados/desbloqueados) y el reconocimiento (anónimo). Nada altera funciones.
import React, { useState } from 'react';
import { Heart, Lock, Check, Sparkles, FlaskConical } from 'lucide-react';
import { Button, Switch, toast } from './ui';
import { SupporterBadge, SupporterFrame } from './SupporterBadge';
import { useSupporter, useInvalidateSupporter } from '../hooks/useSupporter';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { supportApi } from '../lib/api';
import { rewardOf, displayTierOf, unlockedTiers, rankOf, type SupporterTier } from '../lib/supporterRewards';
import { ROOM_THEMES } from '../lib/roomThemes';

const COVER: Record<string, string> = {
  amigo: 'from-pink-400/40 via-rose-300/25 to-amber-200/25',
  colaborador: 'from-sky-400/40 via-primary/25 to-indigo-300/25',
  patrocinador: 'from-amber-400/40 via-fuchsia-400/30 to-violet-500/30',
};
const MIN_TIER_LABEL: Record<number, string> = { 2: 'Colaborador', 3: 'Patrocinador' };

export default function SupporterPanel() {
  const { user } = useAuthStore();
  const { data: supporter, isLoading } = useSupporter();
  const invalidate = useInvalidateSupporter();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);

  const tier = supporter?.tier ?? null;       // nivel alcanzado (entitlement)
  const reward = rewardOf(tier);
  const displayTier = displayTierOf(supporter) ?? tier; // estilo mostrado (elegible)
  const styleReward = rewardOf(displayTier);

  const setStyle = async (t: SupporterTier) => {
    setBusy('style');
    try { await supportApi.updateMe({ badge: t }); invalidate(); toast('Estilo actualizado ✨', 'success'); }
    catch (e: any) { toast(e.response?.data?.error || 'No se pudo cambiar el estilo', 'error'); }
    finally { setBusy(null); }
  };
  const setTheme = async (themeId: string | null) => {
    setBusy('theme');
    try { await supportApi.updateMe({ theme: themeId }); invalidate(); toast('Tema actualizado 🎬', 'success'); }
    catch (e: any) { toast(e.response?.data?.error || 'No se pudo cambiar el tema', 'error'); }
    finally { setBusy(null); }
  };
  const setAnonymous = async (v: boolean) => {
    setBusy('anon');
    try { await supportApi.updateMe({ anonymous: v }); invalidate(); }
    catch (e: any) { toast(e.response?.data?.error || 'No se pudo guardar', 'error'); }
    finally { setBusy(null); }
  };
  const devGrant = async (t: SupporterTier) => {
    setBusy('dev');
    try { await supportApi.devGrant(t); invalidate(); toast(`Concedido ${t} (dev) 🧪`, 'success'); }
    catch (e: any) { toast(e.response?.data?.error || 'Dev-grant no habilitado en el servidor', 'error'); }
    finally { setBusy(null); }
  };

  if (isLoading) {
    return <div className="h-24 rounded-2xl bg-[var(--surface-2)] dark:bg-dark-surface2 animate-pulse" />;
  }

  // ── No supporter ──
  if (!tier || !reward) {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl border-2 border-dashed border-primary/40 bg-primary/5 p-5 flex items-center gap-4">
          <Heart className="w-7 h-7 text-primary shrink-0" />
          <div className="flex-1">
            <p className="font-bold">Todavía no sos supporter</p>
            <p className="text-sm text-[var(--text-muted)]">Si querés, podés apoyar a Cinecito y desbloquear insignias, fondos y temas de sala. Todo es opcional y solo decorativo.</p>
          </div>
          <Button size="sm" onClick={() => navigate('/apoyar')}><Heart className="w-4 h-4" /> Apoyar</Button>
        </div>

        {import.meta.env.DEV && (
          <div className="rounded-2xl border border-[var(--border)] p-4">
            <p className="text-xs font-semibold flex items-center gap-1.5 mb-2"><FlaskConical className="w-4 h-4 text-primary" /> Probar recompensas (solo desarrollo)</p>
            <div className="flex flex-wrap gap-2">
              {(['amigo', 'colaborador', 'patrocinador'] as SupporterTier[]).map((t) => (
                <Button key={t} size="sm" variant="secondary" loading={busy === 'dev'} onClick={() => devGrant(t)}>{t}</Button>
              ))}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-2">Requiere <code>SUPPORT_DEV_GRANT=true</code> o rol ADMIN en el backend.</p>
          </div>
        )}
      </div>
    );
  }

  // ── Supporter ──
  const since = supporter?.since ? new Date(supporter.since).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }) : null;
  return (
    <div className="space-y-5">
      {/* Estado + preview con recompensas VIP aplicadas (fondo, marco, Pochi) */}
      <div className="rounded-3xl border border-[var(--border)] overflow-hidden">
        <div className={`relative h-32 bg-cover bg-center bg-gradient-to-r ${COVER[displayTier!] || COVER[tier]}`}
          style={{ backgroundImage: `url(${styleReward?.assets.bg || reward.assets.bg})` }}>
          <img src={styleReward?.assets.pochi || reward.assets.pochi} alt="" draggable={false}
            className="absolute bottom-1 right-2 w-20 h-auto select-none drop-shadow-lg" />
        </div>
        <div className="px-5 pb-5 -mt-12">
          <div className="flex items-end gap-3">
            <SupporterFrame tier={displayTier} name={user?.username} src={user?.avatar} size={48} className="shrink-0" />
            <div className="pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-bold">{user?.username}</span>
                <SupporterBadge tier={displayTier} />
              </div>
              {since && <p className="text-xs text-[var(--text-muted)] mt-0.5">Apoyás a Cinecito desde {since} 💛</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Recompensas desbloqueadas */}
      <div>
        <p className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-primary" /> Tus recompensas</p>
        <ul className="grid sm:grid-cols-2 gap-2">
          {reward.rewards.map((rw) => (
            <li key={rw} className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
              <Check className="w-4 h-4 mt-0.5 shrink-0 text-[var(--success)]" /> {rw}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-[var(--text-muted)] mt-2">Recordá: son detalles visuales de agradecimiento. No dan ninguna ventaja.</p>
      </div>

      {/* Selector de estilo (qué look mostrar entre los niveles desbloqueados) */}
      {rankOf(tier) >= 2 && (
        <div>
          <p className="text-sm font-semibold mb-1">Estilo del perfil</p>
          <p className="text-xs text-[var(--text-muted)] mb-2">Elegí qué insignia, marco y fondo mostrar. Podés lucir el de cualquier nivel que ya desbloqueaste.</p>
          <div className="flex flex-wrap gap-2">
            {unlockedTiers(tier).map((t) => {
              const active = displayTier === t;
              return (
                <button key={t} onClick={() => setStyle(t)} disabled={busy === 'style'}
                  className={`rounded-2xl border-2 px-2.5 py-1.5 transition-all ${active ? 'border-primary bg-primary/10' : 'border-[var(--border)] hover:border-primary/40'}`}>
                  <SupporterBadge tier={t} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selector de tema de sala */}
      <div>
        <p className="text-sm font-semibold mb-2">Tema de sala</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {/* Opción ninguno */}
          <button onClick={() => setTheme(null)} disabled={busy === 'theme'}
            className={`relative rounded-2xl border-2 p-3 text-left transition-all ${!supporter?.theme ? 'border-primary bg-primary/10' : 'border-[var(--border)] hover:border-primary/40'}`}>
            <span className="block h-8 rounded-lg bg-[var(--surface-2)] dark:bg-dark-surface2 mb-2" />
            <span className="text-xs font-semibold">Ninguno</span>
          </button>
          {ROOM_THEMES.map((t) => {
            const unlocked = supporter?.unlockedThemes?.includes(t.id);
            const selected = supporter?.theme === t.id;
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => unlocked && setTheme(t.id)} disabled={!unlocked || busy === 'theme'}
                title={unlocked ? t.description : `Se desbloquea con ${MIN_TIER_LABEL[t.minTier]}`}
                className={`relative rounded-2xl border-2 p-3 text-left transition-all
                  ${selected ? 'border-primary bg-primary/10' : 'border-[var(--border)] hover:border-primary/40'}
                  ${!unlocked ? 'opacity-60 cursor-not-allowed' : ''}`}>
                <span className={`block h-8 rounded-lg bg-gradient-to-br ${t.swatch} mb-2`} />
                <span className="text-xs font-semibold flex items-center gap-1"><Icon className="w-3.5 h-3.5" /> {t.name}</span>
                {!unlocked && (
                  <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-bold text-[var(--text-muted)] bg-[var(--surface)]/90 dark:bg-dark-surface/90 px-1.5 py-0.5 rounded-full">
                    <Lock className="w-3 h-3" /> {MIN_TIER_LABEL[t.minTier]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-2">El tema decora tu vista de la sala. Es opcional y no cambia cómo funciona.</p>
      </div>

      {/* Reconocimiento / anónimo */}
      <div className="flex items-center justify-between gap-4 py-2 border-t border-[var(--border)]">
        <div>
          <p className="text-sm font-semibold">Permanecer anónimo</p>
          <p className="text-xs text-[var(--text-muted)]">No mostrar mi apoyo en el muro de agradecimientos.</p>
        </div>
        <Switch checked={!!supporter?.anonymous} disabled={busy === 'anon'} onChange={setAnonymous} label="Permanecer anónimo" />
      </div>
    </div>
  );
}
