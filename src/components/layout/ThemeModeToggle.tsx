"use client";

import { useCallback, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type ThemeMode = "dark" | "light";

const THEME_STORAGE_KEY = "chod-theme-mode:v1";

function normalizeThemeMode(value: string | null): ThemeMode {
  return value === "light" ? "light" : "dark";
}

function applyThemeMode(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
}

export function ThemeModeToggle() {
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    try {
      const storedMode = normalizeThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY));
      setMode(storedMode);
      applyThemeMode(storedMode);
    } catch {
      setMode("dark");
      applyThemeMode("dark");
    }
  }, []);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== THEME_STORAGE_KEY) return;
      const nextMode = normalizeThemeMode(event.newValue);
      setMode(nextMode);
      applyThemeMode(nextMode);
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const toggleThemeMode = useCallback(() => {
    setMode((currentMode) => {
      const nextMode = currentMode === "dark" ? "light" : "dark";
      applyThemeMode(nextMode);
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextMode);
      } catch {
        // Theme mode is still applied for this tab even if storage is blocked.
      }
      return nextMode;
    });
  }, []);

  return (
    <button
      aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
      aria-pressed={mode === "light"}
      className={`theme-mode-toggle theme-mode-toggle--${mode}`}
      onClick={toggleThemeMode}
      title={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
      type="button"
    >
      <span className="theme-mode-toggle__track" aria-hidden="true">
        <span className="theme-mode-toggle__knob">
          <span className="theme-mode-toggle__icon theme-mode-toggle__icon--sun">
            <Sun size={11} />
          </span>
          <span className="theme-mode-toggle__icon theme-mode-toggle__icon--moon">
            <Moon size={11} />
          </span>
        </span>
      </span>
      <span className="theme-mode-toggle__label">{mode === "dark" ? "Dark" : "Light"}</span>
    </button>
  );
}
