// apps/web/tailwind.config.cjs  — FASE 1A
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fredoka', 'Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        cursive: ['Pacifico', 'cursive'],
      },
      colors: {
        // Brand Cinecito (gira alrededor de Pochi)
        primary:   { DEFAULT: '#6ECBF5', dark: '#1D6FA8', fg: '#FFFFFF' },
        secondary: { DEFAULT: '#FF8FB0', fg: '#5A1430' },
        accent:    { DEFAULT: '#C9B6FF', fg: '#3C2F73' },
        marquee:   '#FFB845',

        // Surfaces (light)
        surface:  '#FFFFFF',
        surface2: '#E9F3FC',
        cinebg:   '#F2F8FF',

        // Dark mode surfaces — sala de proyección (sin negro puro)
        dark: {
          bg:       '#0E1726',
          surface:  '#16203A',
          surface2: '#1E2B49',
          border:   '#2C3C60',
        },

        // Semantic
        online: '#34C77B',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'cine-sm': '0 2px 8px rgba(110,203,245,0.15)',
        'cine':    '0 4px 20px rgba(110,203,245,0.25)',
        'cine-lg': '0 8px 40px rgba(110,203,245,0.35)',
        'glow':    '0 0 24px rgba(110,203,245,0.4)',
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
