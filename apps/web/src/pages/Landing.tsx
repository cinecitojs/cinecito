// apps/web/src/pages/Landing.tsx  — FASE 4 (Etapa 1: reconstrucción del Landing)
// Página pública de marketing. NO toca reproducción/chat/llamadas/salas.
// Usa los tokens existentes (sala de proyección, Fredoka, Pacifico) + componentes UI.
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Play, Video, MessageCircle, Clapperboard, Sparkles,
  Check, ArrowRight, Heart, Share2, Film,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { Button, Badge } from '../components/ui';
import ThemeToggle from '../components/ui/ThemeToggle';

// ── Datos de secciones ──────────────────────────────────────────
const STEPS = [
  { n: 1, color: 'text-primary bg-primary/15', title: 'Creá una sala', desc: 'Elegí tu video y abrí la sala en un toque.' },
  { n: 2, color: 'text-pink-500 bg-secondary/20', title: 'Compartí el código', desc: '6 letras o un link, y tus amigos entran al instante.' },
  { n: 3, color: 'text-purple-500 bg-accent/20', title: 'Miren juntos', desc: 'Play sincronizado, voz y chat en vivo. ¡A disfrutar!' },
];

const BENEFITS = [
  { icon: Play,           color: 'bg-primary/10 text-primary',          title: 'Sincronía perfecta',     desc: 'Play, pausa y avance se aplican a todos a la vez, sin desfasajes.' },
  { icon: Video,          color: 'bg-accent/20 text-purple-500',        title: 'Videollamada integrada', desc: 'Véanse las caras mientras miran. Cámara y micrófono opcionales.' },
  { icon: MessageCircle,  color: 'bg-secondary/20 text-pink-500',       title: 'Chat + reacciones',      desc: 'Comentá y reaccioná en tiempo real, sin perderte la escena.' },
  { icon: Clapperboard,   color: 'bg-marquee/20 text-amber-500',        title: 'Cualquier fuente',       desc: 'YouTube, MP4, HLS o tus propios archivos. Sin instalar nada.' },
];

export default function Landing() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Navbar ───────────────────────────────────────── */}
      <header className="sticky top-0 z-30 glass border-b border-[var(--border)]">
        <nav className="flex items-center justify-between px-5 sm:px-6 py-3 max-w-6xl mx-auto w-full">
          <Link to="/" className="font-cursive text-2xl text-primary" aria-label="Cinecito — inicio">
            Cinecito
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            {isAuthenticated ? (
              <Link to="/home"><Button size="sm"><Film className="w-4 h-4" /> Mis salas</Button></Link>
            ) : (
              <>
                <Link to="/login"><Button variant="ghost" size="sm">Iniciar sesión</Button></Link>
                <Link to="/register"><Button size="sm">Empezar</Button></Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {/* ── Hero ───────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Ambiente "sala de proyección" */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-[-6rem] left-1/2 -translate-x-1/2 w-[42rem] h-[42rem] rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute bottom-[-8rem] right-[-6rem] w-[28rem] h-[28rem] rounded-full bg-secondary/10 blur-3xl" />
          </div>

          <div className="relative max-w-6xl mx-auto w-full px-5 sm:px-6 pt-12 sm:pt-16 pb-16 sm:pb-20
                          grid lg:grid-cols-2 gap-10 lg:gap-8 items-center">
            {/* Texto */}
            <div className="text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold
                               text-primary bg-primary/15 animate-slide-up">
                <Sparkles className="w-3.5 h-3.5" /> Cine social en tu navegador
              </span>
              <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-[1.08] mt-4 mb-4
                             animate-slide-up" style={{ animationDelay: '0.05s' }}>
                Mirá juntos,
                <span className="block text-primary">aunque estén lejos.</span>
              </h1>
              <p className="text-[var(--text-muted)] text-base sm:text-lg max-w-lg mx-auto lg:mx-0 leading-relaxed mb-7
                            animate-slide-up" style={{ animationDelay: '0.1s' }}>
                Salas de cine compartidas con reproducción en sincronía, videollamada
                y chat con reacciones. Todo en una sola pestaña.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start
                              animate-slide-up" style={{ animationDelay: '0.15s' }}>
                {isAuthenticated ? (
                  <Link to="/home">
                    <Button size="lg" className="min-w-44"><Film className="w-5 h-5" /> Ver mis salas</Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/register">
                      <Button size="lg" className="min-w-44"><Play className="w-5 h-5" /> Empezar gratis</Button>
                    </Link>
                    <Link to="/guest">
                      <Button variant="secondary" size="lg" className="min-w-44">Entrar como invitado</Button>
                    </Link>
                  </>
                )}
              </div>

              <p className="text-xs text-[var(--text-muted)] mt-5 flex items-center gap-1.5 justify-center lg:justify-start
                            animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <Check className="w-3.5 h-3.5 text-[var(--success)]" /> Sin instalar nada · YouTube, MP4 y más
              </p>
            </div>

            {/* Mascota + chips de pilares */}
            <div className="relative flex items-center justify-center py-6 animate-scale-in" style={{ animationDelay: '0.15s' }}>
              <div className="absolute w-72 h-72 rounded-full bg-primary/10 blur-2xl" aria-hidden="true" />
              <img
                src="/pochi.png?v=20260622"
                alt="Pochi, la mascota de Cinecito, saludando"
                className="relative w-56 sm:w-64 lg:w-72 h-auto drop-shadow-xl animate-float select-none"
                draggable={false}
              />

              {/* Chips flotantes — los 3 pilares */}
              <span className="absolute top-2 left-2 sm:left-6 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                               text-xs font-bold bg-primary text-[#06243a] shadow-cine animate-float-slow">
                <Play className="w-3.5 h-3.5" /> En sincronía
              </span>
              <span className="absolute bottom-10 left-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                               text-xs font-bold bg-accent text-[var(--accent-fg)] shadow-cine animate-float-slow"
                    style={{ animationDelay: '0.6s' }}>
                <Video className="w-3.5 h-3.5" /> Videollamada
              </span>
              <span className="absolute top-12 right-0 sm:right-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                               text-xs font-bold bg-secondary text-[var(--secondary-fg)] shadow-cine animate-float-slow"
                    style={{ animationDelay: '1.1s' }}>
                <Heart className="w-3.5 h-3.5" /> Reacciones
              </span>
            </div>
          </div>
        </section>

        {/* ── Cómo funciona ──────────────────────────────── */}
        <section id="como-funciona" className="scroll-mt-20 max-w-5xl mx-auto w-full px-5 sm:px-6 py-12 sm:py-16">
          <div className="text-center mb-10">
            <Badge color="blue" className="mb-3">En 3 pasos</Badge>
            <h2 className="font-display font-bold text-2xl sm:text-3xl">Tan fácil como invitar a unos amigos</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {STEPS.map((s, i) => (
              <div key={s.n}
                className="relative bg-surface dark:bg-dark-surface rounded-3xl p-6 border border-[var(--border)]
                           shadow-cine-sm animate-slide-up" style={{ animationDelay: `${0.05 + i * 0.05}s` }}>
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-display font-bold text-lg mb-4 ${s.color}`}>
                  {s.n}
                </div>
                <h3 className="font-bold mb-1">{s.title}</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="hidden sm:block absolute top-1/2 -right-3 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]/40" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Beneficios ─────────────────────────────────── */}
        <section id="beneficios" className="scroll-mt-20 max-w-5xl mx-auto w-full px-5 sm:px-6 pb-12 sm:pb-16">
          <div className="text-center mb-10">
            <Badge color="pink" className="mb-3">Todo incluido</Badge>
            <h2 className="font-display font-bold text-2xl sm:text-3xl">Una sala, todo lo que necesitás</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BENEFITS.map((b, i) => {
              const Icon = b.icon;
              return (
                <div key={b.title}
                  className="bg-surface dark:bg-dark-surface rounded-3xl p-6 border border-[var(--border)]
                             shadow-cine-sm hover:shadow-cine hover:-translate-y-0.5 transition-all
                             animate-slide-up" style={{ animationDelay: `${0.05 + i * 0.05}s` }}>
                  <div className={`w-12 h-12 rounded-2xl ${b.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold mb-1">{b.title}</h3>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Conocé a Pochi ─────────────────────────────── */}
        <section className="max-w-5xl mx-auto w-full px-5 sm:px-6 pb-12 sm:pb-16">
          <div className="relative overflow-hidden bg-surface dark:bg-dark-surface rounded-4xl border border-[var(--border)]
                          shadow-cine-sm p-6 sm:p-10 flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
            <div className="absolute -left-10 -bottom-10 w-56 h-56 rounded-full bg-secondary/10 blur-2xl pointer-events-none" aria-hidden="true" />
            <img
              src="/pochi-wink.png?v=20260622"
              alt="Pochi guiñando un ojo"
              className="relative w-40 sm:w-48 h-auto drop-shadow-xl shrink-0 animate-float select-none"
              draggable={false}
            />
            <div className="relative text-center sm:text-left">
              <Badge color="purple" className="mb-3">Tu anfitrión</Badge>
              <h2 className="font-display font-bold text-2xl sm:text-3xl mb-2">Conocé a Pochi</h2>
              <p className="text-[var(--text-muted)] leading-relaxed max-w-md">
                El gato más coqueto del cine te recibe en cada sala, le pone onda a la función
                y se asegura de que nadie se pierda el mejor momento. 🐾
              </p>
            </div>
          </div>
        </section>

        {/* ── CTA final ──────────────────────────────────── */}
        <section className="max-w-4xl mx-auto w-full px-5 sm:px-6 pb-16 sm:pb-24">
          <div className="relative overflow-hidden rounded-4xl border border-[var(--border)] shadow-cine
                          bg-surface dark:bg-dark-surface text-center p-8 sm:p-12">
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] rounded-full bg-primary/10 blur-3xl" />
            </div>
            <h2 className="relative font-display font-bold text-3xl sm:text-4xl mb-3">¿Listos para la función?</h2>
            <p className="relative text-[var(--text-muted)] mb-7 max-w-md mx-auto">
              Creá tu primera sala en menos de un minuto. Es gratis y no necesitás instalar nada.
            </p>
            <div className="relative flex flex-col sm:flex-row gap-3 justify-center">
              {isAuthenticated ? (
                <Link to="/home"><Button size="lg" className="min-w-48"><Film className="w-5 h-5" /> Ver mis salas</Button></Link>
              ) : (
                <>
                  <Link to="/register"><Button size="lg" className="min-w-48"><Play className="w-5 h-5" /> Empezar gratis</Button></Link>
                  <Link to="/join"><Button variant="secondary" size="lg" className="min-w-48"><Share2 className="w-5 h-5" /> Tengo un código</Button></Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto w-full px-5 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center sm:items-start gap-1">
            <span className="font-cursive text-xl text-primary">Cinecito</span>
            <span className="text-xs text-[var(--text-muted)]">Hecho con cariño para ver en compañía.</span>
          </div>
          <nav className="flex items-center gap-5 text-sm text-[var(--text-muted)]" aria-label="Navegación del pie">
            <a href="#como-funciona" className="hover:text-primary transition-colors">Cómo funciona</a>
            <a href="#beneficios" className="hover:text-primary transition-colors">Beneficios</a>
            <Link to="/login" className="hover:text-primary transition-colors">Iniciar sesión</Link>
          </nav>
        </div>
        <div className="border-t border-[var(--border)] py-4 text-center text-xs text-[var(--text-muted)]">
          © 2026 Cinecito · Hecho con <Heart className="inline w-3 h-3 text-secondary -mt-0.5" /> para amigos
        </div>
      </footer>
    </div>
  );
}
