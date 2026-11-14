/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#060c09',
          surface: '#0a1210',
          card: '#0e1a12',
          cardElevated: '#111e15',
        },
        emerald: {
          500: '#22c55e',
          400: '#4ade80',
          600: '#16a34a',
        },
        gold: {
          500: '#f59e0b',
          400: '#fbbf24',
          600: '#d97706',
        },
        sky: {
          500: '#38bdf8',
          400: '#7dd3fc',
          600: '#0284c7',
        },
        fgText: {
          primary: '#eef4f0',
          secondary: '#94a3b8',
          muted: '#64748b',
        },
        fgBorder: {
          subtle: 'rgba(255, 255, 255, 0.08)',
          emerald: 'rgba(34, 197, 94, 0.25)',
          emeraldActive: 'rgba(34, 197, 94, 0.6)',
        },
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        emeraldGlow: '0 0 25px rgba(34, 197, 94, 0.2)',
        cardGlow: '0 4px 20px -2px rgba(0, 0, 0, 0.7), 0 0 15px rgba(34, 197, 94, 0.08)',
      },
    },
  },
  plugins: [],
};
