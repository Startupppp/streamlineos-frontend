"use client";

import { useCallback, useSyncExternalStore } from "react";

const FLAG_EVENT = "stored-flag-change";

function readFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "false") === true;
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(FLAG_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(FLAG_EVENT, onChange);
  };
}

function getServerSnapshot(): boolean {
  return false;
}

export function useStoredFlag(key: string): [boolean, (next: boolean) => void] {
  const getSnapshot = useCallback(() => readFlag(key), [key]);
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setFlag = useCallback(
    (next: boolean) => {
      window.localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event(FLAG_EVENT));
    },
    [key],
  );

  return [value, setFlag];
}
