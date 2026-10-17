"use client";

import { useCallback, useSyncExternalStore } from "react";
import { orgScopedStorageKey, useOrgStorageScope } from "@/lib/org-scoped-storage";

const CHANGE_EVENT = "gdpr-export-job-change";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function getServerSnapshot(): string | null {
  return null;
}

/**
 * The id of the caller's last async export. The backend has no "my jobs" list, so
 * the id is remembered per organisation in this browser; without it a reload would
 * lose the archive the worker is still building.
 */
export function useStoredExportJobId(): [string | null, (jobId: string | null) => void] {
  const key = orgScopedStorageKey("gdpr-export-job", useOrgStorageScope());
  const read = useCallback(() => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);
  const jobId = useSyncExternalStore(subscribe, read, getServerSnapshot);

  const setJobId = useCallback(
    (next: string | null) => {
      try {
        if (next) window.localStorage.setItem(key, next);
        else window.localStorage.removeItem(key);
      } catch {
        // Storage refused (private mode): the archive is not remembered across reloads.
      }
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [key],
  );

  return [jobId, setJobId];
}
