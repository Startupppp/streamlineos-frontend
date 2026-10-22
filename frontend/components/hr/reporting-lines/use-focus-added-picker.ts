"use client";

import { useEffect, useRef } from "react";

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
