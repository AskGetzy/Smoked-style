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
          DEFAULT: '#1a2744',
          light: '#243258',
          dark: '#121c33',
        },
        brand: {
          orange: '#e87722',
          gold: '#d4a84b',
          cream: '#fdf8f0',
        },
      },
    },
  },
  plugins: [],
}
export default config
