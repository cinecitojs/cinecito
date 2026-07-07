// apps/web/tailwind.config.cjs  — FASE 1A
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Dos familias, una voz: Fredoka (display/wordmark) + Nunito (cuerpo).
        sans:    ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fredoka', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        cursive: ['Fredoka', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Brand Cinecito — mundo de Pociné (periwinkle/lavanda soñador)
        primary:   { DEFAULT: '#6FB1E0', dark: '#2E78B6', fg: '#FFFFFF' },
        secondary: { DEFAULT: '#C0AEE8', fg: '#4A3A78' },
        accent:    { DEFAULT: '#F4B0C9', fg: '#8A3357' },
        marquee:   '#E3B45C',

        // Surfaces (light) — periwinkle-crema aireado
        surface:  '#FFFFFF',
        surface2: '#E8EAFB',
        cinebg:   '#F1F2FC',

        // Dark mode — "modo función": noche periwinkle suave
        dark: {
          bg:       '#181A2E',
          surface:  '#20233E',
          surface2: '#2A2E4C',
          border:   '#393E62',
        },

        // Semantic
        online: '#4FBE94',
      },
      borderRadius: {
        // Escala domada: tarjetas ≤20px, contenedores grandes ≤24px (antes 24/32).
        '2xl': '1rem',      // 16px — tarjetas, botones, inputs
        '3xl': '1.25rem',   // 20px — tarjetas grandes
        '4xl': '1.5rem',    // 24px — paneles/contenedores hero
      },
      boxShadow: {
        // Sombras neutras tintadas, theme-aware (ver --shadow-* en index.css).
        // El glow celeste deja de ser universal: queda reservado a 1-2 momentos.
        'cine-sm': 'var(--shadow-sm)',
        'cine':    'var(--shadow-md)',
        'cine-lg': 'var(--shadow-lg)',
        'glow':    'var(--glow)',
      },
      keyframes: {
        float:      { '0%,100%': { transform: 'translateY(0)' },       '50%': { transform: 'translateY(-10px)' } },
        'float-slow':{ '0%,100%': { transform: 'translateY(0) rotate(-2deg)' }, '50%': { transform: 'translateY(-15px) rotate(2deg)' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'fade-in':  { from: { opacity: '0' }, to: { opacity: '1' } },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        // Reacción flotante: nace abajo, sube y se desvanece.
        'reaction-float': {
          '0%':   { opacity: '0', transform: 'translateY(0) scale(0.6)' },
          '12%':  { opacity: '1', transform: 'translateY(-12%) scale(1.15)' },
          '70%':  { opacity: '1' },
          '100%': { opacity: '0', transform: 'translateY(-200%) scale(0.95)' },
        },
      },
      animation: {
        'float':      'float 3s ease-in-out infinite',
        'float-slow': 'float-slow 4s ease-in-out infinite',
        'slide-up':   'slide-up 0.4s ease-out both',
        'scale-in':   'scale-in 0.3s ease-out both',
        'fade-in':    'fade-in 0.3s ease-out both',
        'shimmer':    'shimmer 1.5s infinite linear',
        'reaction-float': 'reaction-float 2.6s ease-out forwards',
      },
    },
  },
  plugins: [],
};
