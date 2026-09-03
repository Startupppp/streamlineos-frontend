"use client";

import { useRef } from "react";

/**
 * Radix restores focus on close to its own `DialogTrigger` and to nothing else:
 *
 *   onCloseAutoFocus: (event) => { event.preventDefault(); triggerRef.current?.focus(); }
 *
 * The `preventDefault()` cancels FocusScope's natural restore first, so a
 * dialog or sheet with no `DialogTrigger` — every controlled shell in this app,
 * and every surface opened from a menu item, a row action or a keyboard
 * shortcut — drops focus onto `<body>`. The keyboard user's next Tab restarts
 * at the top of the document and a screen reader announces nothing. That is
 * WCAG 2.4.3, and no static scan can see it.
 *
 * This captures the element that was focused when the overlay mounted and
 * returns it there. Where a trigger does exist the captured element IS the
 * trigger, so behaviour is unchanged.
 *
 * The capture point matters: see `onOpenAutoFocus` below.
 */
export interface RestoreFocusHandlers {
  onOpenAutoFocus: (event: Event) => void;
  onCloseAutoFocus: (event: Event) => void;
}

export function useRestoreFocusOnClose(): RestoreFocusHandlers {
  const openerRef = useRef<HTMLElement | null>(null);

  /**
   * Captured in `onOpenAutoFocus`, not in a mount effect. The wrapper component
   * renders on every parent render — Radix gates the actual overlay on
   * `Presence` further down the tree — so a mount effect here fires while the
   * sheet is still closed and records `<body>`. FocusScope dispatches this event
   * while the opener is still the active element, which is the one moment the
   * answer is right.
   */
  function handleOpenAutoFocus(_event: Event): void {
    const active = document.activeElement;
    openerRef.current =
      active instanceof HTMLElement && active !== document.body ? active : null;
  }

  function handleCloseAutoFocus(event: Event): void {
    const opener = openerRef.current;
    /**
     * Left to Radix when there is nothing to go back to, or when the opener has
     * since left the document — a menu item that unmounted with its menu, say.
     * Preventing the default and then focusing nothing is the bug, not the fix.
     */
    if (!opener || !opener.isConnected) return;
    event.preventDefault();
    opener.focus();
  }

  return { onOpenAutoFocus: handleOpenAutoFocus, onCloseAutoFocus: handleCloseAutoFocus };
}
