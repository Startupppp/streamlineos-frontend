"use client";

import { useEffect, useRef } from "react";

export interface KeyboardWedgeOptions {
  maxGapMs?: number;
  minLength?: number;
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

  const buffer = useRef("");
  const lastKeyAt = useRef(0);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    function handle(event: KeyboardEvent): void {
      const now = Date.now();
      const gap = now - lastKeyAt.current;
      lastKeyAt.current = now;

      if (gap > maxGapMs) buffer.current = "";

      if (event.key === "Enter" || event.key === "Tab") {
        const payload = buffer.current;
        buffer.current = "";
        if (payload.length >= minLength) {
          event.preventDefault();
          onScanRef.current(payload);
        }
        return;
      }

      if (event.key.length === 1) {
        buffer.current += event.key;
      } else if (event.key === "Unidentified" && "keyCode" in event && event.keyCode === 29) {
        buffer.current += "\x1D";
      } else {
        return;
      }

      if (isEditable(event.target) && gap > maxGapMs) {
        buffer.current = "";
      }
    }

    document.addEventListener("keydown", handle, true);
    return () => document.removeEventListener("keydown", handle, true);
  }, [enabled, maxGapMs, minLength]);
}
