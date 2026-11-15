/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#070a08',
          surface: '#0b120e',
          card: '#0f1712',
          cardElevated: '#142119',
        },
        emerald: {
          500: '#10b981',
          400: '#34d399',
          600: '#059669',
          glow: '#00e575',
        },
        gold: {
          500: '#f59e0b',
          400: '#fbbf24',
          600: '#d97706',
        },
        fgText: {
          primary: '#f8fafc',
          secondary: '#94a3b8',
          muted: '#64748b',
        },
        fgBorder: {
          subtle: 'rgba(255, 255, 255, 0.08)',
          emerald: 'rgba(16, 185, 129, 0.25)',
          emeraldActive: 'rgba(16, 185, 129, 0.6)',
        },
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
