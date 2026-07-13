/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Theme-aware via CSS variables (see index.css). Light + dark.
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        text: "rgb(var(--text) / <alpha-value>)",
        // Violet accent. brand-soft flips darker in light theme for contrast.
        brand: {
          DEFAULT: "#8b5cf6",
          soft: "rgb(var(--brand-soft) / <alpha-value>)",
        },
        good: "#10b981",
        bad: "#f43f5e",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "var(--shadow-card)",
      },
    },
  },
  plugins: [],
};
