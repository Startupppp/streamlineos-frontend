"use client";

import { useEffect, useCallback } from "react";

const INPUT_SELECTOR = [
  "input",
  "textarea",
  "select",
  '[contenteditable=""]',
  '[contenteditable="true"]',
].join(",");

function isInsideInput(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return target.closest(INPUT_SELECTOR) !== null;
}

export interface AllWorkKeyboardCallbacks {
  onNext: () => void;
  onPrev: () => void;
  onOpen: () => void;
  onClearSelection: () => void;
  onFocusSearch: () => void;
}

export function useAllWorkKeyboard(callbacks: AllWorkKeyboardCallbacks): void {
  const { onNext, onPrev, onOpen, onClearSelection, onFocusSearch } = callbacks;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isInsideInput(event.target)) return;

      switch (event.key) {
        case "j":
          event.preventDefault();
          onNext();
          break;
        case "k":
          event.preventDefault();
          onPrev();
          break;
        case "Enter":
          event.preventDefault();
          onOpen();
          break;
        case "Escape":
          onClearSelection();
          break;
        case "/":
          event.preventDefault();
          onFocusSearch();
          break;
      }
    },
    [onNext, onPrev, onOpen, onClearSelection, onFocusSearch],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}
