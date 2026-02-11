import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        stone: {
          850: '#1f1a16',
        },
        caveman: {
          orange: '#e67e22',
          brown: '#8b4513',
          tan: '#d2b48c',
          dark: '#2c1810',
        },
      },
      fontFamily: {
        caveman: ['Georgia', 'serif'],
      },
      animation: {
        'shake': 'shake 0.5s ease-in-out',
        'pulse-fast': 'pulse 0.5s ease-in-out infinite',
        'bounce-slow': 'bounce 1.5s infinite',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-10px)' },
          '75%': { transform: 'translateX(10px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
