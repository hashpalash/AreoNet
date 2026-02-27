/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sand: {
          50: "#fdf8f0",
          100: "#f9edd8",
          200: "#f2d9ab",
          300: "#e8be74",
          400: "#dc9e3c",
          500: "#cc8420",
          600: "#b36b17",
          700: "#935215",
          800: "#774019",
          900: "#623519",
        },
        terrain: {
          rock: "#8B7355",
          bush: "#4A7023",
          log: "#8B4513",
          landscape: "#C4A862",
          sky: "#87CEEB",
          sand: "#DEB887",
          gravel: "#A9A9A9",
          water: "#4169E1",
          vegetation: "#228B22",
          obstacle: "#DC143C",
        },
        dunenet: {
          dark: "#0A0A0F",
          darker: "#050508",
          accent: "#E8A020",
          glow: "#F5C842",
          steel: "#1A1A2E",
          panel: "#0D1117",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        display: ["Space Grotesk", "Inter", "sans-serif"],
      },
      animation: {
        "scan-line": "scan 3s linear infinite",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "radar": "radar 4s linear infinite",
        "grid-move": "gridMove 20s linear infinite",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 5px #E8A020, 0 0 20px #E8A020" },
          "50%": { boxShadow: "0 0 20px #E8A020, 0 0 60px #E8A020, 0 0 100px #E8A020" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        radar: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        gridMove: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "50px 50px" },
        },
      },
      backgroundImage: {
        "grid-pattern": "linear-gradient(rgba(232,160,32,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(232,160,32,0.05) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
