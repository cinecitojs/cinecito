// apps/web/src/components/SupporterBadge.tsx
// Piezas cosméticas de supporter: insignia, marco de avatar y efectos decorativos.
// 100% visual; no afectan ninguna función. Leen de supporterRewards.
import React from 'react';
import { rewardOf, type SupporterTier } from '../lib/supporterRewards';

const SIZE = {
  xs: 'h-5 px-1.5 text-[10px] gap-0.5',
  sm: 'h-6 px-2 text-[11px] gap-1',
  md: 'h-7 px-2.5 text-xs gap-1.5',
};

export function SupporterBadge({
  tier, size = 'sm', showLabel = true, className = '',
}: { tier?: string | null; size?: keyof typeof SIZE; showLabel?: boolean; className?: string }) {
  const r = rewardOf(tier);
  if (!r) return null;
  const Icon = r.icon;
  const iconSize = size === 'xs' ? 'w-3 h-3' : size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <span
      title={`${r.label} · supporter de Cinecito`}
      className={`inline-flex items-center rounded-full font-bold bg-gradient-to-r ${r.gradient} ${r.textOn} ${SIZE[size]} ${className}`}>
      <Icon className={iconSize} />
      {showLabel && <span className="leading-none">{r.label}</span>}
    </span>
  );
}

// Avatar dentro del marco VIP (imagen con centro transparente). `width` = ancho del
// marco; el avatar se ubica en el círculo según framePos. El marco se pinta encima.
export function FramedAvatar({
  tier, name, src, width = 200, className = '',
}: { tier?: string | null; name?: string; src?: string | null; width?: number; className?: string }) {
  const r = rewardOf(tier);
  const initial = (name || '?').charAt(0).toUpperCase();
  if (!r?.assets?.frame) {
    return (
      <span className={`inline-flex rounded-full overflow-hidden bg-primary/15 items-center justify-center ${className}`} style={{ width, height: width }}>
        {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <span className="font-display font-bold text-primary">{initial}</span>}
      </span>
    );
  }
  const { cx, cy, d } = r.assets.framePos;
  const av = (width * d) / 100;
  return (
    <div className={`relative select-none ${className}`} style={{ width }}>
      <span className="absolute rounded-full overflow-hidden bg-[var(--surface-2)] dark:bg-dark-surface2 flex items-center justify-center"
        style={{ left: `${cx}%`, top: `${cy}%`, width: av, height: av, transform: 'translate(-50%, -50%)' }}>
        {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <span className="font-display font-bold text-primary" style={{ fontSize: av * 0.42 }}>{initial}</span>}
      </span>
      <img src={r.assets.frame} alt="" draggable={false} className="relative block w-full h-auto pointer-events-none" />
    </div>
  );
}

// Marco decorativo. Con `name`/`src` usa el marco VIP (imagen). Si se pasa `children`
// (avatar ya armado) y no hay datos, cae a un anillo CSS.
export function SupporterFrame({
  tier, name, src, size = 96, children, className = '',
}: { tier?: string | null; name?: string; src?: string | null; size?: number; children?: React.ReactNode; className?: string }) {
  const r = rewardOf(tier);
  if (r?.assets?.frame && (src !== undefined || name !== undefined)) {
    const width = Math.round(size / (r.assets.framePos.d / 100));
    return <FramedAvatar tier={tier} name={name} src={src} width={width} className={className} />;
  }
  if (!r) return <>{children}</>;
  const ring = r.frame === 'glow'
    ? `ring-4 ${r.ring} shadow-[0_0_16px_rgba(110,203,245,0.55)]`
    : `ring-2 ${r.ring}`;
  return (
    <span className={`inline-flex rounded-full ring-offset-2 ring-offset-[var(--surface)] ${ring} ${className}`}>
      {children}
    </span>
  );
}

// Efectos decorativos (sparkles flotantes) — colaborador+. Overlay absoluto, no interactivo.
export function SupporterEffects({ tier }: { tier?: string | null }) {
  const r = rewardOf(tier);
  if (!r?.hasEffects) return null;
  const special = r.hasSpecialAnim;
  const pieces = special ? ['✨', '👑', '✨', '⭐', '✨', '💫'] : ['✨', '⭐', '✨', '💫'];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden="true">
      {pieces.map((p, i) => (
        <span key={i}
          className="absolute animate-float select-none motion-reduce:animate-none"
          style={{
            left: `${8 + (i * 83) % 84}%`,
            top: `${10 + (i * 47) % 70}%`,
            fontSize: `${special ? 14 : 11}px`,
            animationDelay: `${i * 0.35}s`,
            animationDuration: `${2.6 + (i % 3) * 0.6}s`,
            opacity: special ? 0.85 : 0.65,
          }}>
          {p}
        </span>
      ))}
    </div>
  );
}
