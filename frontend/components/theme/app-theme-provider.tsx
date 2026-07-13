"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  APP_THEMES,
  APP_THEME_MODE_STORAGE_KEY,
  APP_THEME_STORAGE_KEY,
  DEFAULT_APP_THEME,
  DEFAULT_APP_THEME_MODE,
  getAppThemeClass,
  isAppThemeId,
  isAppThemeMode,
  resolveIsDark,
  type AppThemeId,
  type AppThemeMode,
} from "@/lib/theme/app-themes";

interface AppThemeContextValue {
  theme: AppThemeId;
  setTheme: (theme: AppThemeId) => void;
  mode: AppThemeMode;
  setMode: (mode: AppThemeMode) => void;
  isDark: boolean;
  suppressTheme: () => () => void;
}

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function readStoredTheme(): AppThemeId {
  if (typeof window === "undefined") return DEFAULT_APP_THEME;
  try {
    const stored = window.localStorage.getItem(APP_THEME_STORAGE_KEY);
    return isAppThemeId(stored) ? stored : DEFAULT_APP_THEME;
  } catch {
    return DEFAULT_APP_THEME;
  }
}

function readStoredMode(): AppThemeMode {
  if (typeof window === "undefined") return DEFAULT_APP_THEME_MODE;
  try {
    const stored = window.localStorage.getItem(APP_THEME_MODE_STORAGE_KEY);
    return isAppThemeMode(stored) ? stored : DEFAULT_APP_THEME_MODE;
  } catch {
    return DEFAULT_APP_THEME_MODE;
  }
}

function readSystemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readSystemPrefersDarkServer(): boolean {
  return false;
}

function subscribeToSystemPrefersDark(onChange: () => void): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function applyThemeClass(theme: AppThemeId): void {
  const root = document.documentElement;
  for (const candidate of APP_THEMES) {
    root.classList.remove(getAppThemeClass(candidate.id));
  }
  if (theme !== DEFAULT_APP_THEME) {
    root.classList.add(getAppThemeClass(theme));
  }
}

function applyDarkClass(isDark: boolean): void {
  const root = document.documentElement;
  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppThemeId>(readStoredTheme);
  const [mode, setModeState] = useState<AppThemeMode>(readStoredMode);
  const systemPrefersDark = useSyncExternalStore(
    subscribeToSystemPrefersDark,
    readSystemPrefersDark,
    readSystemPrefersDarkServer,
  );
  const [suppressions, setSuppressions] = useState(0);

  const isSuppressed = suppressions > 0;
  const effectiveTheme = isSuppressed ? DEFAULT_APP_THEME : theme;
  const isDark = !isSuppressed && resolveIsDark(mode, systemPrefersDark);

  useEffect(() => {
    applyThemeClass(effectiveTheme);
  }, [effectiveTheme]);

  useEffect(() => {
    applyDarkClass(isDark);
  }, [isDark]);

  useEffect(() => {
    return () => {
      applyThemeClass(DEFAULT_APP_THEME);
      applyDarkClass(false);
    };
  }, []);

  const setTheme = useCallback((next: AppThemeId) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(APP_THEME_STORAGE_KEY, next);
    } catch {
      return;
    }
  }, []);

  const setMode = useCallback((next: AppThemeMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(APP_THEME_MODE_STORAGE_KEY, next);
    } catch {
      return;
    }
  }, []);

  const suppressTheme = useCallback(() => {
    setSuppressions((count) => count + 1);
    return () => setSuppressions((count) => Math.max(0, count - 1));
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, mode, setMode, isDark, suppressTheme }),
    [theme, setTheme, mode, setMode, isDark, suppressTheme],
  );

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme(): AppThemeContextValue {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider");
  }
  return context;
}
