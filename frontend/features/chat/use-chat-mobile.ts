"use client";

import { useSyncExternalStore } from "react";

const CHAT_PANEL_NARROW_QUERY = "(max-width: 1023px)";

function subscribeMediaQuery(query: string, onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(query);
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

export function useIsChatPanelNarrow(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => subscribeMediaQuery(CHAT_PANEL_NARROW_QUERY, onStoreChange),
    () => window.matchMedia(CHAT_PANEL_NARROW_QUERY).matches,
    () => false,
  );
}
