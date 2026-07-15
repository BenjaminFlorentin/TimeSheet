/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0a1c',
        surface: '#161430',
        surface2: '#282455',
        accent: '#e8b923',
        accent2: '#a678ff',
        muted: '#9a93c9',
      },
      fontFamily: {
        magic: ['Cinzel', 'serif'],
      },
    },
  },
  plugins: [],
};
