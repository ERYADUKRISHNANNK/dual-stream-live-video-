/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#0b0813",
          card: "rgba(22, 16, 41, 0.65)",
          border: "rgba(139, 92, 246, 0.25)",
          cyan: "#06b6d4",
          violet: "#8b5cf6",
          pink: "#ec4899",
          neonGreen: "#10b981",
          gold: "#f59e0b",
          dark: "#05030a"
        }
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"]
      },
      boxShadow: {
        cyber: "0 0 15px rgba(139, 92, 246, 0.4)",
        cyan: "0 0 15px rgba(6, 182, 212, 0.4)",
        pink: "0 0 15px rgba(236, 72, 153, 0.4)"
      }
    },
  },
  plugins: [],
}
