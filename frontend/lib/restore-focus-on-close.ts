"use client";

import { useRef } from "react";

export interface RestoreFocusHandlers {
  onOpenAutoFocus: (event: Event) => void;
  onCloseAutoFocus: (event: Event) => void;
}

export function useRestoreFocusOnClose(): RestoreFocusHandlers {
  const openerRef = useRef<HTMLElement | null>(null);

  function handleOpenAutoFocus(_event: Event): void {
    const active = document.activeElement;
    openerRef.current =
      active instanceof HTMLElement && active !== document.body ? active : null;
  }

  function handleCloseAutoFocus(event: Event): void {
    const opener = openerRef.current;
    if (!opener || !opener.isConnected) return;
    event.preventDefault();
    opener.focus();
  }

  return { onOpenAutoFocus: handleOpenAutoFocus, onCloseAutoFocus: handleCloseAutoFocus };
}
