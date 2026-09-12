"use client";

import { useEffect, useRef } from "react";

/**
 * INV-203 — keyboard wedge capture.
 *
 * A wedge scanner is a keyboard as far as the browser is concerned: it types
 * the payload and presses Enter. That leaves two problems this hook exists to
 * solve, and both of them are about telling a scanner apart from a person.
 *
 * **Speed is the only reliable signal.** A scanner emits characters a few
 * milliseconds apart; nobody types a fourteen-digit GTIN in 40ms. So the buffer
 * resets whenever the gap between keystrokes exceeds `maxGapMs`, which means a
 * human typing into the page can never accumulate into a scan, and a scan is
 * never contaminated by a keystroke that happened to precede it.
 *
 * **Focus is not a reliable signal.** Warehouse operators scan while the page
 * has focus wherever it happens to be, so listening only on a focused input
 * loses scans. But blindly capturing everything would also swallow a picker
 * typing a note. The compromise: while an editable element has focus we let it
 * have its keystrokes, *unless* they arrive at scanner speed, in which case the
 * hardware is talking and the field can have the rest.
 *
 * FNC1 (ASCII 29) is preserved rather than filtered. It is the group separator
 * that tells a GS1 parser where a variable-length element ends, and a shell
 * that helpfully strips control characters turns a multi-element label into one
 * long lot number.
 */
export interface KeyboardWedgeOptions {
  /** Longest gap between keystrokes still considered one scan. */
  maxGapMs?: number;
  /** Shorter than this and it is a keypress, not a scan. */
  minLength?: number;
  /** Set false to stop listening without unmounting. */
  enabled?: boolean;
}

const EDITABLE = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return EDITABLE.has(target.tagName) || target.isContentEditable;
}

export function useKeyboardWedge(
  onScan: (payload: string) => void,
  options: KeyboardWedgeOptions = {},
): void {
  const { maxGapMs = 40, minLength = 4, enabled = true } = options;

  // Held in refs, not state: a scan is a dozen keystrokes in under a tenth of a
  // second, and re-rendering on each one would drop characters.
  const buffer = useRef("");
  const lastKeyAt = useRef(0);
  const onScanRef = useRef(onScan);

  // Kept current in an effect rather than assigned during render, so the
  // listener below can stay mounted across re-renders without going stale.
  // Re-subscribing on every render would drop keystrokes mid-scan.
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    function handle(event: KeyboardEvent): void {
      const now = Date.now();
      const gap = now - lastKeyAt.current;
      lastKeyAt.current = now;

      // Too slow to be hardware: whatever was accumulating was a person.
      if (gap > maxGapMs) buffer.current = "";

      if (event.key === "Enter" || event.key === "Tab") {
        const payload = buffer.current;
        buffer.current = "";
        if (payload.length >= minLength) {
          // Only now do we claim the keystroke. Cancelling Enter on a human's
          // form submission would be a maddening bug to diagnose.
          event.preventDefault();
          onScanRef.current(payload);
        }
        return;
      }

      // Printable characters and the GS1 separator; everything else (arrows,
      // modifiers, function keys) is not payload.
      if (event.key.length === 1) {
        buffer.current += event.key;
      } else if (event.key === "Unidentified" && "keyCode" in event && event.keyCode === 29) {
        buffer.current += "\x1D";
      } else {
        return;
      }

      // A person typing in a field keeps their keystrokes; hardware does not
      // have to give them up.
      if (isEditable(event.target) && gap > maxGapMs) {
        buffer.current = "";
      }
    }

    document.addEventListener("keydown", handle, true);
    return () => document.removeEventListener("keydown", handle, true);
  }, [enabled, maxGapMs, minLength]);
}
