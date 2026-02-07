/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: '#020202',
        space: { DEFAULT: '#080808', light: '#0D0D0D', dark: '#010101' },
        metallic: { DEFAULT: '#D1D1D6', light: '#FFFFFF', dark: '#636366' },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      letterSpacing: {
        'ultra-tight': '-0.05em',
        'super-wide': '0.4em',
      },
      animation: {
        'float': 'float 20s ease-in-out infinite',
        'float-reverse': 'float 25s ease-in-out infinite reverse',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(10%, -10%) scale(1.1)' },
          '66%': { transform: 'translate(-5%, 15%) scale(0.9)' },
        }
      }
    },
  },
  plugins: [],
}
