import type { ChangeEvent } from "react";

/**
 * A single text box standing in for a list — survey options, notification
 * roles, tags. The rule is `split(",").map(trim).filter(Boolean)` and it was
 * written inline at each such box, which is how one of them came to keep a
 * blank entry and another to keep the surrounding spaces.
 *
 * `filter(Boolean)` is what stops a trailing comma producing an empty option
 * that the backend then stores and renders as a nameless choice.
 */
export function parseCommaList(raw: string): string[] {
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function commaListChange(
  onChange: (value: string[]) => void,
): (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void {
  return function handleCommaListChange(event) {
    onChange(parseCommaList(event.target.value));
  };
}
