import plugin from 'tailwindcss/plugin'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({
        'html, body, #root': {
          minWidth: '320px',
          width: '100%',
          minHeight: '100%',
          height: '100%',
          margin: '0',
        },
        'body': {
          fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
        '::-webkit-scrollbar': { width: '8px', height: '8px' },
        '::-webkit-scrollbar-track': { background: '#f1f5f9', borderRadius: '4px' },
        '::-webkit-scrollbar-thumb': { background: '#cbd5e1', borderRadius: '4px' },
        '::-webkit-scrollbar-thumb:hover': { background: '#94a3b8' },
      })
    }),
  ],
}
