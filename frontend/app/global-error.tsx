"use client";

import { useEffect, useMemo, useState } from "react";
import { reportError } from "@/lib/observability/error-reporter";
import {
  APP_THEME_MODE_STORAGE_KEY,
  DEFAULT_APP_THEME_MODE,
  isAppThemeMode,
  resolveIsDark,
} from "@/lib/theme/app-themes";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

function readIsDark(): boolean {
  try {
    const storedMode = window.localStorage.getItem(APP_THEME_MODE_STORAGE_KEY);
    const mode = isAppThemeMode(storedMode) ? storedMode : DEFAULT_APP_THEME_MODE;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return resolveIsDark(mode, systemDark);
  } catch {
    return false;
  }
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [isDark] = useState(() =>
    typeof window === "undefined" ? false : readIsDark(),
  );

  useEffect(() => {
    reportError(error, { digest: error.digest, source: "global-error-boundary" });
  }, [error]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
    root.classList.toggle("light", !isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
  }, [isDark]);

  const palette = useMemo(
    () =>
      isDark
        ? {
            background: "#0b1120",
            foreground: "#e2e8f0",
            muted: "#94a3b8",
            border: "#334155",
            buttonBg: "#1e293b",
          }
        : {
            background: "#f8fafc",
            foreground: "#0f172a",
            muted: "#64748b",
            border: "#cbd5e1",
            buttonBg: "#ffffff",
          },
    [isDark],
  );

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: palette.background,
          color: palette.foreground,
        }}
      >
        <div
          role="alert"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
            textAlign: "center",
            maxWidth: "28rem",
            padding: "2rem",
          }}
        >
          <p style={{ fontSize: "2rem", margin: 0 }} aria-hidden="true">
            ⚠
          </p>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "0.875rem", color: palette.muted, margin: 0 }}>
            A critical error occurred. Refreshing the page may resolve it.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem 1.25rem",
              borderRadius: "0.5rem",
              border: `1px solid ${palette.border}`,
              background: palette.buttonBg,
              color: palette.foreground,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
