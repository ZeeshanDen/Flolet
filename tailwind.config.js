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
        raised: "rgb(var(--raised) / <alpha-value>)",
        // brand = primary action fill (black in light, mint in dark);
        // on-brand = text on it; brand-soft = accent text / highlights.
        brand: {
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          soft: "rgb(var(--brand-soft) / <alpha-value>)",
        },
        "on-brand": "rgb(var(--on-brand) / <alpha-value>)",
        good: "#16a34a",
        bad: "#e5484d",
        warn: "#d97706",
      },
      fontFamily: {
        sans: [
          "Geist Variable",
          "Geist",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
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
