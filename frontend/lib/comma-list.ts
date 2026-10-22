import type { ChangeEvent } from "react";

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
