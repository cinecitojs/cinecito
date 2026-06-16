/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F6FBFF',
        surface: '#FFFFFF',
        accent: '#7CC8FF',
        accentDark: '#1D6FA8',
        text: '#0F1724',
      },
    },
  },
  plugins: [],
};
