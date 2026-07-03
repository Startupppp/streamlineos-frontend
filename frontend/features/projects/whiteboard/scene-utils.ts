import type { ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";

export function isExcalidrawScene(value: unknown): value is ExcalidrawInitialDataState {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record["elements"]);
}

export function computeStoredVersion(elements: unknown[]): number {
  let sum = 0;
  for (const el of elements) {
    if (typeof el !== "object" || el === null) continue;
    const r = el as Record<string, unknown>;
    const v = r["version"];
    if (typeof v === "number") sum += v;
  }
  return sum;
}
