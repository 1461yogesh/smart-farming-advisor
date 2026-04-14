/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Cormorant Garamond", "Georgia", "serif"],
        body: ["DM Sans", "system-ui", "sans-serif"],
      },
      colors: {
        earth: {
          50:  "#faf6ef",
          100: "#f2e9d8",
          200: "#e4d0b0",
          300: "#d3b282",
          400: "#c0905a",
          500: "#b07540",
          600: "#975f36",
          700: "#7c4a2d",
          800: "#663d28",
          900: "#553425",
        },
        forest: {
          50:  "#f1f8f2",
          100: "#dcf0de",
          200: "#bae0bf",
          300: "#8ec896",
          400: "#5fab6b",
          500: "#3d9050",
          600: "#2d7340",
          700: "#245c34",
          800: "#1f492b",
          900: "#1b3d25",
          950: "#0d2115",
        },
        clay: {
          50:  "#fdf8f6",
          100: "#f7ece5",
          200: "#f0d5c9",
          300: "#e4b49f",
          400: "#d48b6d",
          500: "#c66b47",
          600: "#b8543a",
          700: "#994331",
          800: "#7d392c",
          900: "#673228",
        },
        parchment: {
          50:  "#fdfbf7",
          100: "#f9f4e8",
          200: "#f2e8cd",
          300: "#e8d5a6",
          400: "#dbbc77",
          500: "#cfa451",
        },
      },
      backgroundImage: {
        "grain": "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")",
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
      },
    },
  },
  plugins: [],
};
