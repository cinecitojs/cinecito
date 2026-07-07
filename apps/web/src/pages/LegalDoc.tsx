// apps/web/src/pages/LegalDoc.tsx
// Renderiza los documentos legales (/legal y /legal/:slug). Público (no requiere sesión).
// Mini-render de markdown propio: encabezados, listas, **negrita**, enlaces internos/externos.
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, ChevronRight } from 'lucide-react';
import { LEGAL_DOCS, LEGAL_BY_SLUG } from '../legal/content';
import ThemeToggle from '../components/ui/ThemeToggle';
import Footer from '../components/layout/Footer';

// ── Inline: **negrita** y [texto](url) ──────────────────────
function inline(text: string, k: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0; let m: RegExpExecArray | null; let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1]) {
      nodes.push(<strong key={`${k}-b${i++}`} className="font-semibold text-[var(--text)]">{m[2]}</strong>);
    } else if (m[3]) {
      const url = m[5];
      if (url.startsWith('/')) {
        nodes.push(<Link key={`${k}-l${i++}`} to={url} className="text-primary hover:underline">{m[4]}</Link>);
      } else {
        nodes.push(<a key={`${k}-l${i++}`} href={url} className="text-primary hover:underline" target="_blank" rel="noreferrer">{m[4]}</a>);
      }
    }
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

// ── Bloques: ## / ### / listas / párrafos / nota _..._ ──────
function renderBody(body: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let list: string[] | null = null;
  let key = 0;
  const flush = () => {
    if (list) {
      out.push(
        <ul key={`ul${key++}`} className="list-disc pl-5 space-y-1.5 my-3 text-[var(--text-muted)]">
          {list.map((li, idx) => <li key={idx} className="leading-relaxed">{inline(li, `li${key}-${idx}`)}</li>)}
        </ul>,
      );
      list = null;
    }
  };
  for (const raw of body.split('\n')) {
    const t = raw.trim();
    if (t === '') { flush(); continue; }
    if (t.startsWith('### ')) { flush(); out.push(<h3 key={`h${key++}`} className="font-display font-bold text-base mt-5 mb-1.5">{inline(t.slice(4), `h${key}`)}</h3>); }
    else if (t.startsWith('## ')) { flush(); out.push(<h2 key={`h${key++}`} className="font-display font-bold text-lg mt-6 mb-2 text-[var(--text)]">{inline(t.slice(3), `h${key}`)}</h2>); }
    else if (t.startsWith('- ')) { if (!list) list = []; list.push(t.slice(2)); }
    else if (t.startsWith('_') && t.endsWith('_')) { flush(); out.push(<p key={`p${key++}`} className="text-xs italic text-[var(--text-muted)] mt-6 pt-4 border-t border-[var(--border)]">{inline(t.slice(1, -1), `p${key}`)}</p>); }
    else { flush(); out.push(<p key={`p${key++}`} className="text-sm text-[var(--text-muted)] leading-relaxed my-2">{inline(t, `p${key}`)}</p>); }
  }
  flush();
  return out;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-surface/80 dark:bg-dark-surface/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="wordmark text-xl">Cinecito</Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">{children}</main>
      <Footer />
    </div>
  );
}

export default function LegalDoc() {
  const { slug } = useParams();

  // Índice /legal
  if (!slug) {
    return (
      <Shell>
        <h1 className="font-display font-bold text-2xl sm:text-3xl mb-1">Centro Legal</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">Documentos y políticas de Cinecito.</p>
        <div className="rounded-2xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden">
          {LEGAL_DOCS.map((d) => (
            <Link key={d.slug} to={`/legal/${d.slug}`}
              className="flex items-center gap-3 p-4 hover:bg-[var(--surface-2)] dark:hover:bg-dark-surface2 transition-colors">
              <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><FileText className="w-4 h-4" /></span>
              <span className="flex-1 font-semibold text-sm">{d.title}</span>
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
            </Link>
          ))}
        </div>
      </Shell>
    );
  }

  const doc = LEGAL_BY_SLUG[slug];
  if (!doc) {
    return (
      <Shell>
        <p className="text-sm text-[var(--text-muted)]">Documento no encontrado.</p>
        <Link to="/legal" className="text-primary hover:underline text-sm">Ver el Centro Legal</Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <Link to="/legal" className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-primary mb-4 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Centro Legal
      </Link>
      <article className="bg-surface dark:bg-dark-surface rounded-3xl border border-[var(--border)] p-6 sm:p-8">
        <h1 className="font-display font-bold text-2xl sm:text-3xl">{doc.title}</h1>
        <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">Última actualización: {doc.updated}</p>
        <div>{renderBody(doc.body)}</div>
      </article>
    </Shell>
  );
}
