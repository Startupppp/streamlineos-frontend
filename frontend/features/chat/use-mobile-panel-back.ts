"use client";

import { useEffect, useEffectEvent } from "react";

const MOBILE_PANEL_QUERY = "(max-width: 767px)";
const PANEL_ENTRY_KEY = "chatPanelEntry";

let pendingBack: ReturnType<typeof setTimeout> | null = null;

function holdsPanelEntry(state: unknown): boolean {
  return (
    typeof state === "object" &&
    state !== null &&
    PANEL_ENTRY_KEY in state &&
    state[PANEL_ENTRY_KEY] === true
  );
}

function releasePanelEntry(): void {
  pendingBack = null;
  if (holdsPanelEntry(window.history.state)) window.history.back();
}

export function useMobilePanelBack(open: boolean, onBack: () => void): void {
  const handleBack = useEffectEvent(onBack);

  useEffect(() => {
    if (!open || !window.matchMedia(MOBILE_PANEL_QUERY).matches) return;
    if (pendingBack !== null) {
      clearTimeout(pendingBack);
      pendingBack = null;
    }
    if (!holdsPanelEntry(window.history.state))
      window.history.pushState({ [PANEL_ENTRY_KEY]: true }, "", window.location.href);
    let popped = false;
    function handlePopState(event: PopStateEvent) {
      if (holdsPanelEntry(event.state)) return;
      popped = true;
      handleBack();
    }
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (popped || !holdsPanelEntry(window.history.state)) return;
      pendingBack = setTimeout(releasePanelEntry, 0);
    };
  }, [open]);
}
