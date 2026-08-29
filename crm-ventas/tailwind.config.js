/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'ui-sans-serif', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px -12px rgba(139, 92, 246, 0.5)',
        'glow-sky': '0 0 40px -12px rgba(56, 189, 248, 0.5)',
      },
    },
  },
  plugins: [],
}
