"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "hr-settings-mode";
const MODE_EVENT = "hr-settings-mode-change";

function readMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "false") === true;
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(MODE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(MODE_EVENT, onChange);
  };
}

function getServerSnapshot(): boolean {
  return false;
}

export function useHrSettingsMode(): [boolean, (next: boolean) => void] {
  const isAdvanced = useSyncExternalStore(subscribe, readMode, getServerSnapshot);

  const setMode = useCallback((next: boolean) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(MODE_EVENT));
  }, []);

  return [isAdvanced, setMode];
}
