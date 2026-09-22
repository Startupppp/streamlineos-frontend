"use client";

import { useState, useEffect, useCallback, useRef } from "react";

function isInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export interface UseMyWorkKeyboardOptions {
  itemCount: number;
  onOpen: (index: number) => void;
  onClearSelection: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export interface UseMyWorkKeyboardReturn {
  focusedIndex: number | null;
  setFocusedIndex: (index: number | null) => void;
}

export function useMyWorkKeyboard({
  itemCount,
  onOpen,
  onClearSelection,
  searchInputRef,
}: UseMyWorkKeyboardOptions): UseMyWorkKeyboardReturn {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  const onClearRef = useRef(onClearSelection);
  onClearRef.current = onClearSelection;

  useEffect(() => {
    if (focusedIndex !== null && focusedIndex >= itemCount) {
      setFocusedIndex(itemCount > 0 ? itemCount - 1 : null);
    }
  }, [itemCount, focusedIndex]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isInputTarget(e.target)) return;

      switch (e.key) {
        case "j":
        case "ArrowDown": {
          e.preventDefault();
          setFocusedIndex((prev) => {
            if (itemCount === 0) return null;
            if (prev === null) return 0;
            return Math.min(prev + 1, itemCount - 1);
          });
          break;
        }
        case "k":
        case "ArrowUp": {
          e.preventDefault();
          setFocusedIndex((prev) => {
            if (prev === null || prev === 0) return null;
            return prev - 1;
          });
          break;
        }
        case "Enter": {
          if (focusedIndex !== null) {
            e.preventDefault();
            onOpenRef.current(focusedIndex);
          }
          break;
        }
        case "Escape": {
          e.preventDefault();
          onClearRef.current();
          setFocusedIndex(null);
          break;
        }
        case "/": {
          e.preventDefault();
          searchInputRef?.current?.focus();
          break;
        }
        default:
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [focusedIndex, itemCount, searchInputRef]);

  const setFocusedIndexStable = useCallback(
    (index: number | null) => setFocusedIndex(index),
    [],
  );

  return { focusedIndex, setFocusedIndex: setFocusedIndexStable };
}
