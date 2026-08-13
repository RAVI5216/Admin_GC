export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 20px 80px rgba(15, 23, 42, 0.12)',
      },
      backdropBlur: {
        xs: '2px',
      },
      colors: {
        brand: {
          50: '#f2f8ff',
          100: '#e5f0ff',
          200: '#c6ddff',
          300: '#91bfff',
          400: '#4a88ff',
          500: '#1f5fff',
          600: '#1749d9',
          700: '#143db2',
          800: '#14348f',
          900: '#122f75',
        },
      },
    },
  },
  plugins: [],
};
