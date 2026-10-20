"use client";

import { useCallback, type KeyboardEvent, type RefObject } from "react";

function markerRunBefore(
  value: string,
  index: number,
  character: string,
): number {
  let run = 0;
  while (index - run > 0 && value[index - run - 1] === character) run += 1;
  return run;
}

function markerRunAfter(
  value: string,
  index: number,
  character: string,
): number {
  let run = 0;
  while (index + run < value.length && value[index + run] === character)
    run += 1;
  return run;
}

function isSameMarker(before: number, after: number, length: number): boolean {
  if (before !== after) return false;
  return before === length || (before === 3 && length <= 2);
}

const FORMAT_SHORTCUTS: Record<string, string> = { b: "**", i: "*", e: "`" };

function selectAfterFormat(
  el: HTMLTextAreaElement,
  from: number,
  length: number,
): void {
  setTimeout(() => {
    el.setSelectionRange(from, from + length);
    el.focus();
  }, 0);
}

export function useComposerFormatting(
  inputRef: RefObject<HTMLTextAreaElement | null>,
  setMessageInput: (value: string) => void,
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void,
) {
  const formatSelection = useCallback(
    (marker: string) => {
      const el = inputRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = el.value.slice(start, end);

      const character = marker[0] ?? "";
      const before = markerRunBefore(el.value, start, character);
      const after = markerRunAfter(el.value, end, character);

      if (isSameMarker(before, after, marker.length)) {
        const unwrapped =
          el.value.slice(0, start - marker.length) +
          selected +
          el.value.slice(end + marker.length);
        setMessageInput(unwrapped);
        selectAfterFormat(el, start - marker.length, selected.length);
        return;
      }

      const body = selected || "text";
      setMessageInput(
        el.value.slice(0, start) + marker + body + marker + el.value.slice(end),
      );
      selectAfterFormat(el, start + marker.length, body.length);
    },
    [inputRef, setMessageInput],
  );

  const handleComposerKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      const marker =
        e.ctrlKey || e.metaKey
          ? FORMAT_SHORTCUTS[e.key.toLowerCase()]
          : undefined;
      if (marker && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        formatSelection(marker);
        return;
      }
      onKeyDown(e);
    },
    [formatSelection, onKeyDown],
  );

  return handleComposerKeyDown;
}
