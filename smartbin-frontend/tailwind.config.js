export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.18)',
        panel: '0 1px 3px rgba(0,0,0,0.3),  0 8px 32px rgba(0,0,0,0.22)',
        glow:  '0 0 24px rgba(31, 95, 255, 0.25)',
      },
      backdropBlur: {
        xs: '2px',
      },
      colors: {
        brand: {
          50:  '#f0f5ff',
          100: '#e0eaff',
          200: '#c3d5ff',
          300: '#93b4ff',
          400: '#4f80ff',
          500: '#1f5fff',
          600: '#1749d9',
          700: '#143db2',
          800: '#14348f',
          900: '#122f75',
          950: '#0b1d4d',
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'live-pulse': 'live-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        'live-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.35' },
        },
      },
    },
  },
  plugins: [],
};
