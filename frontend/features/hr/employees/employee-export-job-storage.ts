"use client";

import { useCallback, useSyncExternalStore } from "react";
import { orgScopedStorageKey } from "@/lib/org-scoped-storage";

const EXPORT_JOB_KEY_NAME = "hr-employee-export-job";

export function exportJobStorageKey(scope: string): string {
  return orgScopedStorageKey(EXPORT_JOB_KEY_NAME, scope);
}

export function loadExportJobId(scope: string): string | null {
  try {
    const raw = localStorage.getItem(exportJobStorageKey(scope));
    return raw && raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function saveExportJobId(scope: string, exportJobId: string): void {
  try {
    localStorage.setItem(exportJobStorageKey(scope), exportJobId);
  } catch {}
  notify();
}

export function clearExportJobId(scope: string): void {
  try {
    localStorage.removeItem(exportJobStorageKey(scope));
  } catch {}
  notify();
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function noStoredJob(): null {
  return null;
}

export function useStoredExportJobId(scope: string): string | null {
  const getSnapshot = useCallback(() => loadExportJobId(scope), [scope]);
  return useSyncExternalStore(subscribe, getSnapshot, noStoredJob);
}
