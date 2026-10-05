"use client";

import { useEffect } from "react";
import type { Ticket } from "@/types/projects";

interface UseTriageKeyboardProps {
  isReady: boolean;
  canUpdate: boolean;
  triageFocusedIndex: number | null | undefined;
  tickets: Ticket[];
  handleAccept: (id: number) => void;
  handleDecline: (id: number) => void;
  isPending: boolean;
  pendingAccept: Set<number>;
  pendingDecline: Set<number>;
}

export function useTriageKeyboard({
  isReady,
  canUpdate,
  triageFocusedIndex,
  tickets,
  handleAccept,
  handleDecline,
  isPending,
  pendingAccept,
  pendingDecline,
}: UseTriageKeyboardProps) {
  useEffect(() => {
    if (!isReady || !canUpdate) return;
    let shortcutPending = false;
    function handleTriageKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          e.target.isContentEditable ||
          e.target.closest(
            '[contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]',
          )
        )
          return;
      }
      if (
        shortcutPending ||
        isPending ||
        pendingAccept.size > 0 ||
        pendingDecline.size > 0
      )
        return;
      if (triageFocusedIndex === null || triageFocusedIndex === undefined)
        return;
      const focused = tickets[triageFocusedIndex];
      if (!focused) return;
      if (e.key === "a") {
        e.preventDefault();
        shortcutPending = true;
        handleAccept(focused.id);
      } else if (e.key === "d") {
        e.preventDefault();
        shortcutPending = true;
        handleDecline(focused.id);
      }
    }
    document.addEventListener("keydown", handleTriageKeyDown);
    return () => document.removeEventListener("keydown", handleTriageKeyDown);
  }, [
    isReady,
    canUpdate,
    triageFocusedIndex,
    tickets,
    handleAccept,
    handleDecline,
    isPending,
    pendingAccept,
    pendingDecline,
  ]);
}
