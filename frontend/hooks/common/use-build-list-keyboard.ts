"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { claimBuildListSearchTarget } from "@/lib/build/build-list-search-target";

const OPEN_OVERLAY_SELECTOR = [
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
  '[role="menu"][data-state="open"]',
  '[data-state="open"][data-slot$="overlay"]',
].join(",");

function isOverlayOpen(): boolean {
  return document.querySelector(OPEN_OVERLAY_SELECTOR) !== null;
}

function isInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable ||
    target.closest('[contenteditable="true"]') !== null
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
  const focusedIndexRef = useRef<number | null>(null);
  const itemCountRef = useRef(itemCount);

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
    focusedIndexRef.current = focusedIndex;
  }, [focusedIndex]);

  useEffect(() => {
    itemCountRef.current = itemCount;
  }, [itemCount]);

  useEffect(() => {
    if (focusedIndex !== null && focusedIndex >= itemCount) {
      setFocusedIndex(itemCount > 0 ? itemCount - 1 : null);
    }
  }, [itemCount, focusedIndex]);

  useEffect(() => {
    if (!enabled || !searchInputRef) return;
    return claimBuildListSearchTarget(searchInputRef);
  }, [enabled, searchInputRef]);

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isInputTarget(e.target)) return;
      if (isOverlayOpen()) return;

      switch (e.key) {
        case "j":
        case "ArrowDown": {
          e.preventDefault();
          setFocusedIndex((prev) => {
            if (itemCountRef.current === 0) return null;
            if (prev === null) return 0;
            return Math.min(prev + 1, itemCountRef.current - 1);
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
          if (focusedIndexRef.current !== null) {
            e.preventDefault();
            onOpenRef.current(focusedIndexRef.current);
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
          if (!searchInputRef) break;
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        }
        case "e": {
          if (focusedIndexRef.current !== null && onEditRef.current) {
            e.preventDefault();
            onEditRef.current(focusedIndexRef.current);
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
  }, [enabled, searchInputRef]);

  const setFocusedIndexStable = useCallback(
    (index: number | null) => setFocusedIndex(index),
    [],
  );

  return { focusedIndex, setFocusedIndex: setFocusedIndexStable };
}
