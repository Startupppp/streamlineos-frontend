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

export interface UseBuildListKeyboardOptions {
  itemCount: number;
  onOpen: (index: number) => void;
  onEdit?: (index: number) => void;
  onCreate?: () => void;
  onClearSelection: () => void;
  onShortcutHelp?: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  enabled?: boolean;
}

export interface UseBuildListKeyboardReturn {
  focusedIndex: number | null;
  setFocusedIndex: (index: number | null) => void;
}

export function useBuildListKeyboard({
  itemCount,
  onOpen,
  onEdit,
  onCreate,
  onClearSelection,
  onShortcutHelp,
  searchInputRef,
  enabled = true,
}: UseBuildListKeyboardOptions): UseBuildListKeyboardReturn {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const onOpenRef = useRef(onOpen);
  const onEditRef = useRef(onEdit);
  const onCreateRef = useRef(onCreate);
  const onClearRef = useRef(onClearSelection);
  const onShortcutHelpRef = useRef(onShortcutHelp);

  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);

  useEffect(() => {
    onEditRef.current = onEdit;
  }, [onEdit]);

  useEffect(() => {
    onCreateRef.current = onCreate;
  }, [onCreate]);

  useEffect(() => {
    onClearRef.current = onClearSelection;
  }, [onClearSelection]);

  useEffect(() => {
    onShortcutHelpRef.current = onShortcutHelp;
  }, [onShortcutHelp]);

  useEffect(() => {
    if (focusedIndex !== null && focusedIndex >= itemCount) {
      setFocusedIndex(itemCount > 0 ? itemCount - 1 : null);
    }
  }, [itemCount, focusedIndex]);

  useEffect(() => {
    if (!enabled) return;

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
        case "e": {
          if (focusedIndex !== null && onEditRef.current) {
            e.preventDefault();
            onEditRef.current(focusedIndex);
          }
          break;
        }
        case "c": {
          if (onCreateRef.current) {
            e.preventDefault();
            onCreateRef.current();
          }
          break;
        }
        case "?": {
          if (onShortcutHelpRef.current) {
            e.preventDefault();
            onShortcutHelpRef.current();
          }
          break;
        }
        default:
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, focusedIndex, itemCount, searchInputRef]);

  const setFocusedIndexStable = useCallback(
    (index: number | null) => setFocusedIndex(index),
    [],
  );

  return { focusedIndex, setFocusedIndex: setFocusedIndexStable };
}
