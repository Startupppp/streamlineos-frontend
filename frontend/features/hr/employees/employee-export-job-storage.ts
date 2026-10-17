"use client";

import { useCallback, useSyncExternalStore } from "react";
import { orgScopedStorageKey } from "@/lib/org-scoped-storage";

const EXPORT_JOB_KEY_NAME = "hr-employee-export-job";

/**
 * Ticket 04. An employee export is a server-side job; the id used to live only
 * in the directory page's component state, so navigating away abandoned a job
 * that was still running and its finished file became unreachable.
 *
 * The scope from `useOrgStorageScope` is already `<orgId>::<userId>`, so a
 * recovered id can never belong to another organisation or another person — and
 * `GET /hr/export/jobs/:id` is scoped to the requester on the server anyway, so
 * a hand-edited value is inert rather than a cross-tenant read.
 */
export function exportJobStorageKey(scope: string): string {
  return orgScopedStorageKey(EXPORT_JOB_KEY_NAME, scope);
}

export function loadExportJobId(scope: string): string | null {
  try {
    const raw = localStorage.getItem(exportJobStorageKey(scope));
    return raw && raw.length > 0 ? raw : null;
  } catch {
    // Private mode, blocked site data, or SSR: an export simply is not recovered.
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
  // Another tab of the same account starting an export is the same event.
  window.addEventListener("storage", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function noStoredJob(): null {
  return null;
}

/**
 * The stored id as an external store rather than state seeded in an effect:
 * `localStorage` does not exist while this is server-rendered, so
 * `getServerSnapshot` answers "no job" and the client picks the id up on
 * hydration without the two disagreeing.
 */
export function useStoredExportJobId(scope: string): string | null {
  const getSnapshot = useCallback(() => loadExportJobId(scope), [scope]);
  return useSyncExternalStore(subscribe, getSnapshot, noStoredJob);
}
