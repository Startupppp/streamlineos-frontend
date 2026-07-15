"use client";

import { useCallback, useEffect, useState } from "react";
import { isProjectNavPinned } from "./project-nav-config";

const STORAGE_KEY = "project-nav-hidden";
const CHANGE_EVENT = "project-nav-hidden-changed";

function readHiddenIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter(
        (id): id is string =>
          typeof id === "string" && id.length > 0 && !isProjectNavPinned(id),
      ),
    );
  } catch {
    return new Set();
  }
}

function writeHiddenIds(ids: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    return;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useProjectNavVisibility() {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const sync = () => setHiddenIds(readHiddenIds());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isVisible = useCallback(
    (id: string) => isProjectNavPinned(id) || !hiddenIds.has(id),
    [hiddenIds],
  );

  const setVisible = useCallback((id: string, visible: boolean) => {
    if (isProjectNavPinned(id)) return;
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (visible) next.delete(id);
      else next.add(id);
      writeHiddenIds(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setHiddenIds(() => {
      const next = new Set<string>();
      writeHiddenIds(next);
      return next;
    });
  }, []);

  return {
    hiddenIds: hiddenIds as ReadonlySet<string>,
    isVisible,
    setVisible,
    reset,
    hasCustomizations: hiddenIds.size > 0,
  };
}
