"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Toaster } from "sonner";

type ColorTheme = "dark" | "light";

const themeStorageKey = "beo-color-theme";
const themeChangeEvent = "beo-theme-change";

function subscribeToTheme(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(themeChangeEvent, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(themeChangeEvent, onStoreChange);
  };
}

function themeSnapshot(): ColorTheme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function serverThemeSnapshot(): ColorTheme {
  return "dark";
}

function setTheme(theme: ColorTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  try {
    window.localStorage.setItem(themeStorageKey, theme);
  } catch {
    // The theme still applies for this session when storage is unavailable.
  }
  window.dispatchEvent(new Event(themeChangeEvent));
}

function useColorTheme() {
  return useSyncExternalStore(subscribeToTheme, themeSnapshot, serverThemeSnapshot);
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useColorTheme();
  const light = theme === "light";
  const nextTheme = light ? "dark" : "light";

  return (
    <button
      className={`theme-toggle${compact ? " compact" : ""}`}
      type="button"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
    >
      {light ? <Sun size={17} /> : <Moon size={17} />}
      {!compact && <span className="theme-label">{light ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}

export function ThemedToaster() {
  const theme = useColorTheme();
  return <Toaster theme={theme} position="top-center" />;
}
