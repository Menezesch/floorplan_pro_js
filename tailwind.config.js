/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        panel: '0 2px 8px rgba(15, 23, 42, 0.12)'
      }
    }
  },
  plugins: []
};
