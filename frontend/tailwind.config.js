/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        vault: {
          dark: '#0a0f1e',
          darker: '#060b16',
          panel: '#0d1526',
          border: '#1a2540',
          accent: '#00d4ff',
          green: '#00ff88',
          red: '#ff3860',
          amber: '#ffb020',
          purple: '#9b5de5',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Orbitron"', 'sans-serif'],
        body: ['"Syne"', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [],
}
