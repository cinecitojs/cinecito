// apps/web/src/components/ui/ThemeToggle.tsx  — FASE 2
import React, { useContext } from 'react';
import { Sun, Moon } from 'lucide-react';
import { ThemeContext } from '../../app/App';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className="w-9 h-9 rounded-full flex items-center justify-center
        bg-surface dark:bg-dark-surface border border-[var(--border)]
        hover:border-primary hover:shadow-cine-sm transition-all"
    >
      {theme === 'dark'
        ? <Sun  className="w-4 h-4 text-yellow-400" />
        : <Moon className="w-4 h-4 text-[var(--text-muted)]" />
      }
    </button>
  );
}
