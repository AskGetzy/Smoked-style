import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1e4035',
          light: '#2d5648',
          dark: '#163029',
        },
        brand: {
          orange: '#c9a04a',
          gold: '#c9a04a',
          cream: '#f4f0e8',
          green: '#1e4035',
          brass: '#c9a04a',
        },
      },
      fontFamily: {
        sans: ['Work Sans', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
}
export default config
