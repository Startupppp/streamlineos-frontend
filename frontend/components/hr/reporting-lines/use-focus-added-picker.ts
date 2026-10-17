"use client";

import { useEffect, useRef } from "react";

/**
 * After "Add additional manager", focus moves to the new row's manager picker
 * (react-hook-form would focus the first registered input, the Relationship
 * field, because the picker registers no ref). Put `listRef` on the element
 * that holds the rows; each row's picker trigger is a `combobox`.
 */
export function useFocusAddedPicker<T extends HTMLElement>() {
  const listRef = useRef<T>(null);
  const pendingIndex = useRef<number | null>(null);

  useEffect(() => {
    if (pendingIndex.current === null) return;
    const triggers = listRef.current?.querySelectorAll<HTMLElement>('[role="combobox"]');
    triggers?.[pendingIndex.current]?.focus();
    pendingIndex.current = null;
  });

  function focusPickerAt(index: number) {
    pendingIndex.current = index;
  }

  return { listRef, focusPickerAt };
}
