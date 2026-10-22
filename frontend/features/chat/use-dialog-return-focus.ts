"use client";

import { useCallback, useState } from "react";

function focusedOpener(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const active = document.activeElement;
  return active instanceof HTMLElement && active !== document.body ? active : null;
}

export function useDialogReturnFocus(fallbackOpener: "search" | "new"): (event: Event) => void {
  const [opener] = useState(focusedOpener);
  return useCallback(
    (event: Event) => {
      const fallbacks = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-chat-opener="${fallbackOpener}"]`),
      );
      for (const candidate of [opener, ...fallbacks]) {
        if (!candidate?.isConnected) continue;
        candidate.focus();
        if (document.activeElement !== candidate) continue;
        event.preventDefault();
        return;
      }
    },
    [opener, fallbackOpener],
  );
}
