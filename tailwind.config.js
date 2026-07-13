/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0f172a',
        surface: '#1e293b',
        surface2: '#334155',
        accent: '#38bdf8',
        accent2: '#a78bfa',
        muted: '#94a3b8',
      },
    },
  },
  plugins: [],
};
