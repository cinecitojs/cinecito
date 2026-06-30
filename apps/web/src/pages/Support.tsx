// apps/web/src/pages/Support.tsx — Sección de apoyo voluntario (/apoyar).
// Monetización ética: gratis siempre, sin presión, niveles simbólicos, recompensas solo
// cosméticas, transparencia total. Responsive + accesible + animaciones suaves.
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Heart, Sparkles, ShieldCheck, Gift, Check, ArrowRight, Info, HandHeart, Wrench, Ban, Lock,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import ThanksWall from '../components/ThanksWall';
import { useSupportModal } from '../store/useSupportModal';
import {
  SUPPORT_TIERS, SUPPORT_CURRENCY, COSMETIC_REWARDS, COSMETIC_DISCLAIMERS,
  IMPACT_ITEMS, TRANSPARENCY_POINTS,
} from '../lib/support';

// Identidad visual por tier (glow distinto, intensidad equivalente).
const TIER_GLOW: Record<string, string> = {
  amigo: 'tier-glow-amigo', colaborador: 'tier-glow-colaborador', patrocinador: 'tier-glow-patrocinador',
};
const TIER_BTN_GRADIENT: Record<string, string> = {
  amigo: 'from-pink-400 to-rose-500',
  colaborador: 'from-sky-400 to-[var(--primary-dark)]',
  patrocinador: 'from-amber-400 via-fuchsia-500 to-violet-600',
};

function SectionTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-8">
      <span className="inline-block text-xs font-bold uppercase tracking-wider text-primary mb-2">{eyebrow}</span>
      <h2 className="font-display font-bold text-2xl sm:text-3xl">{title}</h2>
      {subtitle && <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">{subtitle}</p>}
    </div>
  );
}

export default function Support() {
  const openSupport = useSupportModal((s) => s.openModal);
  const { symbol, note } = SUPPORT_CURRENCY;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14">

        {/* ── HERO ── */}
        <header className="relative text-center mb-14">
          <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-72 rounded-full bg-primary/10 blur-3xl" />
          </div>
          <img src="/pocine-celebrate.png?v=20260622" alt="Pociné, la mascota de Cinecito"
            className="w-24 h-auto mx-auto mb-4 drop-shadow-2xl animate-float select-none motion-reduce:animate-none" draggable={false} />
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary mb-3">
            <HandHeart className="w-4 h-4" /> Apoyo voluntario
          </span>
          <h1 className="font-display font-bold text-3xl sm:text-4xl leading-tight">Ayudá a que Cinecito siga rodando</h1>
          <p className="text-[var(--text-muted)] mt-3 max-w-xl mx-auto leading-relaxed">
            Cinecito <span className="font-semibold text-[var(--text)]">es y será gratis</span>. Si te gusta y podés,
            tu aporte voluntario ayuda a cubrir hosting, mantenimiento y nuevas funciones.
            Sin presión: todo lo importante seguirá disponible para todos.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
            {['100% voluntario', 'Siempre gratis', 'Sin ventajas de pago'].map((p) => (
              <span key={p} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface-2)] dark:bg-dark-surface2 text-xs font-semibold">
                <Check className="w-3.5 h-3.5 text-[var(--success)]" /> {p}
              </span>
            ))}
          </div>

          {/* CTA principal — glow permanente suave + sheen al hover (premium, no agresivo) */}
          <div className="mt-7">
            <button
              onClick={() => openSupport(null)}
              className="group sheen-host cta-glow inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-primary to-[var(--primary-dark)] text-white font-display font-bold text-base
                         hover:-translate-y-1 hover:scale-[1.03] hover:brightness-110 active:scale-[0.98] transition-all duration-300 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100">
              <Heart className="w-5 h-5 fill-white/90 group-hover:scale-110 transition-transform motion-reduce:transition-none" />
              Apoyar Cinecito
            </button>
            <p className="text-[11px] text-[var(--text-muted)] mt-2">Sin compromiso · podés cerrar esto cuando quieras</p>
          </div>
        </header>

        {/* ── TARJETAS DE APOYO ── */}
        <section id="tiers-section" aria-labelledby="tiers-h" className="mb-6 scroll-mt-20">
          <p id="tiers-h" className="text-center text-sm text-[var(--text-muted)] mb-6 max-w-xl mx-auto">
            Elegí el gesto que quieras. <span className="font-semibold text-[var(--text)]">Todos los niveles apoyan igual</span> el
            proyecto — las diferencias son solo detalles visuales de agradecimiento.
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 items-start">
            {SUPPORT_TIERS.map((t) => {
              const Icon = t.icon;
              return (
                <div key={t.id}
                  className={`relative flex flex-col rounded-3xl border-2 bg-surface dark:bg-dark-surface p-6 transition-all duration-300
                    hover:-translate-y-1 hover:shadow-cine motion-reduce:hover:translate-y-0 motion-reduce:transition-none
                    ${t.premium ? `${t.ring} shadow-cine` : 'border-[var(--border)] hover:border-primary/40'}`}>
                  {t.premium && (
                    <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-fuchsia-500 to-violet-600 text-white text-[10px] font-bold shadow">
                      <Sparkles className="w-3 h-3" /> Máximo apoyo
                    </span>
                  )}
                  <div className={`absolute inset-x-0 top-0 h-24 -z-10 rounded-t-3xl bg-gradient-to-b ${t.glow} to-transparent opacity-70`} />
                  <span className={`w-12 h-12 rounded-2xl bg-[var(--surface-2)] dark:bg-dark-surface2 flex items-center justify-center ${t.accent} mb-4`}>
                    <Icon className="w-6 h-6" />
                  </span>
                  <h3 className="font-display font-bold text-lg">{t.name}</h3>
                  <p className="text-sm text-[var(--text-muted)] mt-1 min-h-[2.5rem]">{t.tagline}</p>
                  <div className="flex items-baseline gap-1 mt-3">
                    <span className="text-2xl font-display font-bold">{symbol}{t.suggested}</span>
                    <span className="text-xs text-[var(--text-muted)]">· {note}</span>
                  </div>

                  <ul className="flex flex-col gap-2 mt-4 mb-5">
                    {t.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2 text-sm">
                        <Sparkles className={`w-4 h-4 mt-0.5 shrink-0 ${t.accent}`} />
                        <span className="text-[var(--text-muted)]">{perk}</span>
                      </li>
                    ))}
                  </ul>

                  <button onClick={() => openSupport(t)}
                    aria-label={`Apoyar como ${t.name}`}
                    className={`group sheen-host mt-auto w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-2xl font-bold text-sm text-white
                      bg-gradient-to-r ${TIER_BTN_GRADIENT[t.id]} ${TIER_GLOW[t.id]}
                      hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98] transition-all duration-300
                      motion-reduce:transition-none motion-reduce:hover:translate-y-0`}>
                    <Heart className="w-4 h-4 fill-white/80 group-hover:scale-110 transition-transform motion-reduce:transition-none" /> Apoyar
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── BENEFICIOS COSMÉTICOS ── */}
        <section className="mt-16">
          <SectionTitle eyebrow="Gracias por tu apoyo" title="Pequeños detalles de agradecimiento"
            subtitle="Si aportás, podés activar recompensas puramente decorativas. Son nuestra forma de decir gracias." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COSMETIC_REWARDS.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.id}
                  className="rounded-3xl border border-[var(--border)] bg-surface dark:bg-dark-surface p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 motion-reduce:hover:translate-y-0">
                  <span className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3"><Icon className="w-5 h-5" /></span>
                  <p className="font-semibold text-sm">{c.title}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{c.description}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)]/50 dark:bg-dark-surface2/50 p-4">
            <p className="text-xs font-semibold flex items-center gap-1.5 mb-2"><Gift className="w-4 h-4 text-primary" /> Estas recompensas:</p>
            <ul className="grid sm:grid-cols-3 gap-2">
              {COSMETIC_DISCLAIMERS.map((d) => (
                <li key={d} className="flex items-start gap-1.5 text-xs text-[var(--text-muted)]">
                  <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--success)]" /> {d}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── INDICADOR DE IMPACTO ── */}
        <section className="mt-16">
          <SectionTitle eyebrow="Transparencia" title="¿A dónde va tu aporte?"
            subtitle="No es una recaudación con meta: es lo que cuesta sostener Cinecito día a día." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {IMPACT_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="rounded-3xl bg-gradient-to-br from-[var(--surface-2)] to-surface dark:from-dark-surface2 dark:to-dark-surface border border-[var(--border)] p-5 transition-all hover:shadow-cine motion-reduce:transition-none">
                  <span className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3"><Icon className="w-5 h-5" /></span>
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>
          {/* Indicadores honestos (sin métricas falsas ni urgencia) */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
            {[
              { icon: Wrench, label: 'En desarrollo activo' },
              { icon: Ban,    label: 'Sin publicidad' },
              { icon: Lock,   label: 'Sin venta de datos' },
            ].map(({ icon: Ic, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] text-xs font-semibold text-[var(--text-muted)]">
                <Ic className="w-3.5 h-3.5 text-primary" /> {label}
              </span>
            ))}
          </div>
        </section>

        {/* ── TRANSPARENCIA / DESCARGOS ── */}
        <section className="mt-16">
          <div className="rounded-3xl border border-[var(--border)] bg-surface dark:bg-dark-surface p-6 sm:p-8 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-11 h-11 rounded-2xl bg-[var(--success)]/15 text-[var(--success)] flex items-center justify-center"><ShieldCheck className="w-6 h-6" /></span>
              <div>
                <h2 className="font-display font-bold text-lg">Transparencia total</h2>
                <p className="text-xs text-[var(--text-muted)]">Para que sepas exactamente qué es (y qué no es) tu aporte.</p>
              </div>
            </div>
            <ul className="grid sm:grid-cols-2 gap-2.5">
              {TRANSPARENCY_POINTS.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 mt-0.5 shrink-0 text-[var(--success)]" />
                  <span className="text-[var(--text-muted)]">{p}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-[var(--text-muted)] mt-5 pt-4 border-t border-[var(--border)] flex items-start gap-1.5 leading-relaxed">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Leé el <Link to="/legal/contribuciones" className="text-primary hover:underline mx-1">aviso legal de contribuciones</Link>
              para todos los detalles. Cinecito seguirá siendo usable de forma gratuita, aportes o no.
            </p>
          </div>
        </section>

        {/* ── MURO DE AGRADECIMIENTOS ── */}
        <section className="mt-16">
          <SectionTitle eyebrow="Comunidad" title="Muro de agradecimientos"
            subtitle="Gracias a quienes hacen posible Cinecito. Aparecer acá es opcional." />
          <ThanksWall />
        </section>

        {/* ── CIERRE ── */}
        <footer className="mt-14 text-center">
          <p className="text-sm text-[var(--text-muted)]">¿Preferís no aportar? Está perfecto. 🐾</p>
          <Link to="/home" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline mt-2">
            Volver a mis salas <ArrowRight className="w-4 h-4" />
          </Link>
        </footer>
      </div>
    </AppLayout>
  );
}
