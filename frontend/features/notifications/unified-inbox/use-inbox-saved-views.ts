"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { orgScopedStorageKey, useOrgStorageScope } from "@/lib/org-scoped-storage";
import type { InboxFilterState } from "./inbox-view-params";
import { filterStateToSearchParams, parseInboxFilterState } from "./inbox-view-params";

export interface SavedInboxView {
  id: string;
  name: string;
  params: string;
}

const STORAGE_NAME = "inbox-saved-views";
const DEFAULT_STATE: SavedInboxView[] = [];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidView(value: unknown): value is SavedInboxView {
  if (!isPlainObject(value)) return false;
  return (
    typeof value["id"] === "string" &&
    typeof value["name"] === "string" &&
    typeof value["params"] === "string"
  );
}

function readViews(storageKey: string): SavedInboxView[] {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === null) return DEFAULT_STATE;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_STATE;
    return parsed.filter(isValidView);
  } catch {
    return DEFAULT_STATE;
  }
}

function writeViews(storageKey: string, views: SavedInboxView[]): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(views));
  } catch {
    return;
  }
}

function generateId(): string {
  return `view-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface UseInboxSavedViewsResult {
  views: SavedInboxView[];
  saveView: (name: string, state: InboxFilterState) => void;
  applyView: (view: SavedInboxView) => InboxFilterState;
  renameView: (id: string, name: string) => void;
  deleteView: (id: string) => void;
}

export function useInboxSavedViews(): UseInboxSavedViewsResult {
  const scope = useOrgStorageScope();
  const storageKey = orgScopedStorageKey(STORAGE_NAME, scope);
  const prevKeyRef = useRef(storageKey);

  const [views, setViews] = useState<SavedInboxView[]>(() => readViews(storageKey));

  useEffect(() => {
    if (prevKeyRef.current === storageKey) return;
    prevKeyRef.current = storageKey;
    setViews(readViews(storageKey));
  }, [storageKey]);

  const update = useCallback(
    (next: SavedInboxView[]) => {
      writeViews(storageKey, next);
      setViews(next);
    },
    [storageKey],
  );

  const saveView = useCallback(
    (name: string, state: InboxFilterState) => {
      const params = filterStateToSearchParams(state).toString();
      const newView: SavedInboxView = { id: generateId(), name: name.trim(), params };
      update([...views, newView]);
    },
    [views, update],
  );

  const applyView = useCallback((view: SavedInboxView): InboxFilterState => {
    return parseInboxFilterState(new URLSearchParams(view.params));
  }, []);

  const renameView = useCallback(
    (id: string, name: string) => {
      update(
        views.map((v) => (v.id === id ? { ...v, name: name.trim() } : v)),
      );
    },
    [views, update],
  );

  const deleteView = useCallback(
    (id: string) => {
      update(views.filter((v) => v.id !== id));
    },
    [views, update],
  );

  return { views, saveView, applyView, renameView, deleteView };
}
