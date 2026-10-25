/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065",
        },
        navy: {
          950: "#090d16",
          900: "#0e1424",
          850: "#131b2e",
          800: "#1b253f",
          750: "#222f4f",
          700: "#2c3b63",
          600: "#3d5084"
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px -5px rgba(124, 58, 237, 0.35)',
        'subtle': '0 2px 10px 0 rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
};
