// apps/web/src/pages/Landing.tsx
// ════════════════════════════════════════════════════════════════════
//  CINECITO · Home compacta (puerta de entrada)
//  Una sola pantalla: lo esencial y nada más. Todo lo demás vive en el
//  dashboard (/home). Estética celeste/crema kawaii premium.
//  Producto: sincroniza la reproducción de enlaces públicos de YouTube y
//  Vimeo. No aloja ni distribuye contenido.
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Play, Youtube, ShieldCheck, Copy, Sparkles, UserRound } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import ThemeToggle from '../components/ui/ThemeToggle';
import CieloScene, { Twinkle } from '../components/layout/CieloScene';

const EASE = [0.16, 1, 0.3, 1] as const;

// Botón propio con rebote suave
function Cta({ to, children, variant = 'primary' }:
  { to: string; children: React.ReactNode; variant?: 'primary' | 'soft' }) {
  return (
    <motion.span className="inline-block" whileHover={{ scale: 1.035, y: -2 }} whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 24 }}>
      <Link to={to}
        className={`cielo-display inline-flex items-center justify-center gap-2.5 px-7 rounded-full
                    text-[1.02rem] font-semibold tracking-tight w-full sm:w-auto
                    focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3E8CCB]/25
                    ${variant === 'primary'
                      ? 'cielo-cta'
                      : 'cielo-panel text-[#3a4a63] dark:text-[#D9DBF2]'}`}
        style={{ height: '3.25rem' }}>
        {children}
      </Link>
    </motion.span>
  );
}

export default function Landing() {
  const { isAuthenticated } = useAuthStore();
  const reduce = useReducedMotion();
  const createTo = isAuthenticated ? '/home' : '/register';

  const fade = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: EASE },
  });

  return (
    <div className="cielo-root relative min-h-[100dvh] flex flex-col overflow-hidden">
      <CieloScene />

      {/* ── Nav ── */}
      <header className="relative z-20 px-4 pt-3 sm:pt-5">
        <nav className="cielo-glass rounded-full max-w-4xl mx-auto h-14 pl-6 pr-2.5 flex items-center justify-between">
          <span className="wordmark text-2xl">Cinecito</span>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            {isAuthenticated ? (
              <motion.span className="inline-block" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}>
                <Link to="/home"
                  className="cielo-cta cielo-display inline-flex items-center gap-2 h-10 px-5 rounded-full text-sm font-semibold">
                  Mi panel
                </Link>
              </motion.span>
            ) : (
              <>
                <Link to="/login"
                  className="cielo-display inline-flex items-center h-10 px-3.5 sm:px-4 rounded-full text-sm font-semibold
                             text-[#3a4a63] dark:text-[#D9DBF2] hover:bg-white/50 dark:hover:bg-white/10 transition-colors">
                  Iniciar sesión
                </Link>
                <motion.span className="inline-block" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 24 }}>
                  <Link to="/register"
                    className="cielo-cta cielo-display inline-flex items-center h-10 px-4 sm:px-5 rounded-full text-sm font-semibold">
                    Registrarme
                  </Link>
                </motion.span>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* ── Hero (una sola pantalla) ── */}
      <main className="relative z-10 flex-1 flex items-start lg:items-center">
        <div className="w-full max-w-6xl mx-auto px-5 sm:px-8 py-8 lg:py-10
                        grid lg:grid-cols-[1.02fr_1fr] gap-10 lg:gap-12 items-center">
          {/* Texto */}
          <div className="text-center lg:text-left">
            <motion.span {...fade(0)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full cielo-panel text-[13px] font-semibold cielo-ink-sky mb-6">
              <Sparkles className="w-4 h-4" /> Sincroniza por enlace, en tiempo real
            </motion.span>

            <motion.h1 {...fade(0.06)}
              className="cielo-display font-bold leading-[1.04] tracking-tight text-[2.5rem] sm:text-5xl lg:text-[3.7rem]">
              Tu sala, tu código,
              <span className="block">tu película <span className="cielo-underline px-1">compartida</span>.</span>
            </motion.h1>

            <motion.p {...fade(0.14)}
              className="mt-5 text-[#54607a] dark:text-[#AEB6D0] text-lg max-w-md mx-auto lg:mx-0 leading-relaxed">
              Pega un enlace de YouTube o Vimeo y miren el mismo segundo, estén donde estén.
            </motion.p>

            <motion.div {...fade(0.2)} className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Cta to={createTo}><Play className="w-5 h-5 fill-white" /> Crear sala</Cta>
              <Cta to="/guest" variant="soft"><UserRound className="w-5 h-5" /> Continuar como invitado</Cta>
            </motion.div>

            <motion.p {...fade(0.26)}
              className="mt-6 inline-flex items-center gap-2 text-[13px] text-[#6a7490] dark:text-[#959DBC]">
              <ShieldCheck className="w-4 h-4 text-[#4FBE94]" />
              Solo sincroniza enlaces públicos. No alojamos videos.
            </motion.p>
          </div>

          {/* Visual: mascota + mini vista previa de sala */}
          <motion.div {...fade(0.16)} className="relative flex justify-center lg:justify-end">
            <Twinkle className="top-0 left-6 lg:left-10" size={20} delay={0} />
            <Twinkle className="bottom-8 left-2 lg:left-6" size={16} delay={1.3} />

            <div className="relative w-full max-w-sm">
              {/* Mascota sobre su nube, ENCIMA de la tarjeta (sin tapar etiquetas) */}
              <div className="relative flex items-end justify-center h-24 sm:h-28 mb-1 z-10 pointer-events-none">
                <div aria-hidden="true"
                  className="absolute bottom-1 w-48 h-16 rounded-full bg-white/85 dark:bg-white/10 blur-lg" />
                <img src="/pocine-hello.png?v=20260630" alt="Pociné, la mascota de Cinecito"
                  className="relative w-24 sm:w-28 h-auto drop-shadow-[0_16px_28px_rgba(62,140,203,.25)]
                             select-none animate-float motion-reduce:animate-none" draggable={false} />
              </div>

              {/* tarjeta de sala (preview + confianza) */}
              <div className="relative z-0 cielo-panel rounded-[1.75rem] p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="online-dot" />
                    <span className="cielo-display font-bold text-[15px]">Sala de Lu</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FF0000]/8 text-[11px] font-bold text-[#c4302b]">
                    <Youtube className="w-3.5 h-3.5" /> YouTube
                  </span>
                </div>

                {/* "pantalla" */}
                <div className="relative aspect-video rounded-2xl overflow-hidden
                                bg-[linear-gradient(135deg,#E6F1FA,#DFE7F7)] dark:bg-[linear-gradient(135deg,#222a44,#1d2138)]
                                grid place-items-center">
                  <span className="w-14 h-14 rounded-full bg-white/85 dark:bg-white/15 grid place-items-center shadow-lg">
                    <Play className="w-6 h-6 cielo-ink-sky fill-current ml-0.5" />
                  </span>
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/35 text-white text-[11px] font-mono font-bold">00:42</span>
                </div>

                {/* sync + participantes */}
                <div className="flex items-center justify-between mt-3.5">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {['#7FBDEA', '#C9BCEF', '#F3C77A'].map((c) => (
                        <span key={c} className="w-7 h-7 rounded-full border-2 border-white dark:border-[#222a44]"
                          style={{ background: c }} />
                      ))}
                    </div>
                    <span className="text-[12px] font-semibold text-[#54607a] dark:text-[#AEB6D0]">en sincronía</span>
                  </div>
                  <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl cielo-glass-soft
                                     text-[12px] font-mono font-bold text-[#3a4a63] dark:text-[#D9DBF2]">
                    LU4K9P <Copy className="w-3.5 h-3.5 opacity-70" />
                  </button>
                </div>
              </div>

              {/* pie de confianza, compacto */}
              <div className="mt-3 flex items-center justify-center gap-3 text-[12px] text-[#7a8398] dark:text-[#8b93b0]">
                <span className="inline-flex items-center gap-1.5"><Youtube className="w-4 h-4 text-[#c4302b]" /> YouTube</span>
                <span className="inline-flex items-center gap-1.5"><Play className="w-3 h-3 fill-current text-[#1199c9]" /> Vimeo</span>
                <span aria-hidden="true" className="w-px h-3 bg-current opacity-25" />
                <span>solo enlaces públicos</span>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
