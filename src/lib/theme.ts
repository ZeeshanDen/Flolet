import { create } from "zustand";

export type Theme = "dark" | "light";
const KEY = "spendly-theme";

function apply(t: Theme) {
  document.documentElement.setAttribute("data-theme", t);
  // Keep browser/OS chrome in sync with the app theme.
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", t === "light" ? "#f9fafb" : "#0a0a0b");
}

function initialTheme(): Theme {
  const saved = localStorage.getItem(KEY) as Theme | null;
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

const initial = initialTheme();
apply(initial); // run before first paint to avoid a flash

interface ThemeState {
  theme: Theme;
  set: (t: Theme) => void;
  toggle: () => void;
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: initial,
  set: (t) => {
    localStorage.setItem(KEY, t);
    apply(t);
    set({ theme: t });
  },
  toggle: () => get().set(get().theme === "dark" ? "light" : "dark"),
}));
