import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          700: '#243052',
          800: '#1A2540',
          900: '#121C33',
          950: '#0D1526',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(15,23,42,0.05), 0 1px 2px -1px rgba(15,23,42,0.04)',
        'card-hover': '0 4px 16px 0 rgba(15,23,42,0.09), 0 2px 6px -2px rgba(15,23,42,0.06)',
        'card-lg': '0 8px 30px 0 rgba(15,23,42,0.10), 0 4px 10px -4px rgba(15,23,42,0.07)',
        'inset-soft': 'inset 0 1px 2px 0 rgba(15,23,42,0.04)',
      },
      animation: {
        'pulse-slow': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-up': 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in': 'slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
