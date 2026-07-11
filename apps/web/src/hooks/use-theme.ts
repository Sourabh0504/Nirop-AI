import { useCallback, useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";
export type Accent = "violet" | "ocean" | "forest" | "sunset" | "rose";

const THEME_KEY = "nirop-ai-theme";
const ACCENT_KEY = "nirop-ai-accent";
const themeListeners = new Set<() => void>();
const accentListeners = new Set<() => void>();

export const ACCENTS: { id: Accent; label: string }[] = [
  { id: "violet", label: "Violet" },
  { id: "ocean", label: "Ocean" },
  { id: "forest", label: "Forest" },
  { id: "sunset", label: "Sunset" },
  { id: "rose", label: "Rose" },
];

function getThemeSnapshot(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function setTheme(theme: Theme) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
  for (const listener of themeListeners) listener();
}

function subscribeTheme(callback: () => void) {
  themeListeners.add(callback);
  return () => themeListeners.delete(callback);
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, (): Theme => "light");

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme]);

  return { theme, setTheme, toggle };
}

function getAccentSnapshot(): Accent {
  const stored = localStorage.getItem(ACCENT_KEY);
  if (stored && ACCENTS.some((a) => a.id === stored)) return stored as Accent;
  return "violet";
}

function applyAccent(accent: Accent) {
  document.documentElement.setAttribute("data-accent", accent);
}

function setAccent(accent: Accent) {
  localStorage.setItem(ACCENT_KEY, accent);
  applyAccent(accent);
  for (const listener of accentListeners) listener();
}

function subscribeAccent(callback: () => void) {
  accentListeners.add(callback);
  return () => accentListeners.delete(callback);
}

export function useAccent() {
  const accent = useSyncExternalStore(subscribeAccent, getAccentSnapshot, (): Accent => "violet");

  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  return { accent, setAccent };
}
