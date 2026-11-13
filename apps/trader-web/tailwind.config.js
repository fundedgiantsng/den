/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#050B08',
          surface: '#08120D',
          card: '#0B1712',
          cardElevated: '#10221A',
        },
        emerald: {
          500: '#10B981',
          400: '#34D399',
          600: '#059669',
        },
        gold: {
          500: '#F59E0B',
          400: '#FBBF24',
          600: '#D97706',
        },
        fgText: {
          primary: '#EEF4F0',
          secondary: '#8FAD99',
          muted: '#52705D',
        },
        fgBorder: {
          subtle: 'rgba(255, 255, 255, 0.07)',
          emerald: 'rgba(16, 185, 129, 0.25)',
          emeraldActive: 'rgba(16, 185, 129, 0.6)',
        },
      },
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
      },
      boxShadow: {
        emeraldGlow: '0 0 25px rgba(16, 185, 129, 0.2)',
        cardGlow: '0 4px 20px -2px rgba(0, 0, 0, 0.7), 0 0 15px rgba(16, 185, 129, 0.08)',
      },
    },
  },
  plugins: [],
};
