"use client";

import { useEffect, useCallback } from "react";
import type { RefObject } from "react";
import type { Notification } from "@/types/notifications";

function isInputTarget(e: KeyboardEvent): boolean {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    target.isContentEditable
  );
}

interface UseInboxKeyboardNavParams {
  notifications: Notification[];
  selectedId: number | null;
  onSelect: (notification: Notification) => void;
  onClearSelection: () => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
}

export function useInboxKeyboardNav({
  notifications,
  selectedId,
  onSelect,
  onClearSelection,
  searchInputRef,
}: UseInboxKeyboardNavParams): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isInputTarget(e)) return;

      if (e.key === "j" || e.key === "k") {
        e.preventDefault();
        const currentIndex =
          selectedId == null
            ? -1
            : notifications.findIndex((n) => n.id === selectedId);
        let nextIndex: number;
        if (e.key === "j") {
          nextIndex =
            currentIndex < 0
              ? 0
              : Math.min(currentIndex + 1, notifications.length - 1);
        } else {
          nextIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
        }
        const next = notifications[nextIndex];
        if (next) onSelect(next);
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        onClearSelection();
        return;
      }

      if (e.key === "Enter") {
        if (selectedId == null) return;
        const current = notifications.find((n) => n.id === selectedId);
        if (current) onSelect(current);
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
    },
    [notifications, selectedId, onSelect, onClearSelection, searchInputRef],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}
