"use client";

import { useCallback, useEffect, useState } from "react";
import type { ForwardableMessage } from "./forward-message-dialog";
import { useMobilePanelBack } from "./use-mobile-panel-back";

interface MessagePanelOverlayOptions {
  threadMessageId: number | null;
  closeThread: () => void;
}

export function useMessagePanelOverlays({ threadMessageId, closeThread }: MessagePanelOverlayOptions) {
  const [showSavedPanel, setShowSavedPanel] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<ForwardableMessage | null>(null);
  const threadOpen = threadMessageId !== null;

  const closeSidePanels = useCallback(() => {
    if (threadOpen) closeThread();
    setShowSavedPanel(false);
  }, [threadOpen, closeThread]);
  useMobilePanelBack(threadOpen || showSavedPanel, closeSidePanels);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "k") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("chat:open-search"));
        return;
      }
      if (e.key === "Escape") {
        if (threadOpen) { closeThread(); return; }
        if (showSavedPanel) setShowSavedPanel(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [threadOpen, showSavedPanel, closeThread]);

  const handleToggleSaved = useCallback(() => { setShowSavedPanel((p) => !p); }, []);

  return { showSavedPanel, setShowSavedPanel, forwardMessage, setForwardMessage, handleToggleSaved };
}
