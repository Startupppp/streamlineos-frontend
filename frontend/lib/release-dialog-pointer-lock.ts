"use client";

import { useEffect } from "react";

const OPEN_OVERLAY =
  '[data-slot="dialog-overlay"][data-state="open"], [data-slot="alert-dialog-overlay"][data-state="open"], [data-slot="sheet-overlay"][data-state="open"]';

/**
 * Radix sets `document.body.style.pointerEvents = "none"` while a dialog is
 * open and clears it on close. Unmounting the dialog while it is still open
 * skips that cleanup, so the page looks normal but ignores every click.
 */
export function useReleaseDialogPointerLock(): void {
  useEffect(() => {
    return () => {
      queueMicrotask(() => {
        if (typeof document === "undefined") return;
        if (document.querySelector(OPEN_OVERLAY)) return;
        if (document.body.style.pointerEvents === "none") {
          document.body.style.pointerEvents = "";
        }
      });
    };
  }, []);
}
