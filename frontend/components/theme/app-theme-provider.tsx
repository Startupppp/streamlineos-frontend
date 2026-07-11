"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  APP_THEMES,
  APP_THEME_STORAGE_KEY,
  DEFAULT_APP_THEME,
  getAppThemeClass,
  isAppThemeId,
  type AppThemeId,
} from "@/lib/theme/app-themes";

interface AppThemeContextValue {
  theme: AppThemeId;
  setTheme: (theme: AppThemeId) => void;
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

function applyThemeClass(theme: AppThemeId): void {
  const root = document.documentElement;
  for (const candidate of APP_THEMES) {
    root.classList.remove(getAppThemeClass(candidate.id));
  }
  if (theme !== DEFAULT_APP_THEME) {
    root.classList.add(getAppThemeClass(theme));
  }
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppThemeId>(readStoredTheme);

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  useEffect(() => {
    return () => {
      applyThemeClass(DEFAULT_APP_THEME);
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

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

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
