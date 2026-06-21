// apps/web/src/components/layout/Footer.tsx
// Footer global con enlaces legales. Responsive (escritorio y móvil).
import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { FOOTER_LEGAL_LINKS } from '../../legal/content';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative z-10 border-t border-[var(--border)] bg-surface/60 dark:bg-dark-surface/60 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-cursive text-lg text-primary leading-none">Cinecito</span>
          <span className="text-xs text-[var(--text-muted)]">© {year}</span>
          <Link to="/apoyar" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
            <Heart className="w-3.5 h-3.5" /> Apoyar
          </Link>
        </div>
        <nav aria-label="Enlaces legales"
          className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          {FOOTER_LEGAL_LINKS.map((l) => (
            <Link key={l.slug} to={`/legal/${l.slug}`}
              className="text-[var(--text-muted)] hover:text-primary transition-colors whitespace-nowrap">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="max-w-6xl mx-auto px-4 pb-5 text-[11px] text-[var(--text-muted)] leading-relaxed">
        Cinecito es una herramienta de sincronización y comunicación. No aloja ni distribuye contenido
        protegido: cada usuario es responsable de los enlaces que comparte.
      </p>
    </footer>
  );
}
