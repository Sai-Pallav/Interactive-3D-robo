/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#030014',
        foreground: '#f4f0ff',
        'void-canvas': '#030014',
        'night-violet': '#0a0118',
        'midnight-surface': '#060317',
        'deep-indigo': '#10093a',
        'lilac-white': '#f4f0ff',
        pearl: '#ffffff',
        ash: '#a8a6b7',
        'ash-lilac': '#9b96b0',
        fog: '#918ea0',
        'dim-fog': '#85808c',
        steel: '#54525f',
        mercury: '#cdccd0',
        dusk: '#72707b',
        'lavender-accent': '#9382ff',
        iris: '#5046e4',
        'ultraviolet-core': '#713dff',
        'lilac-beam': '#b7a4fb',
        'horizon-glow': '#8562ff',
      },
      fontFamily: {
        display: ['Sora', 'Plus Jakarta Sans', 'sans-serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'reflect-lg': 'rgba(255, 255, 255, 0.04) 0px 0px 24px 0px inset',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
      },
      animation: {
        'pulse-glow': 'pulseGlow 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
