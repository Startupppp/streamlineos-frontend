import type { ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isExcalidrawScene(value: unknown): value is ExcalidrawInitialDataState {
  if (!isRecord(value)) return false;
  return Array.isArray(value["elements"]);
}

export function computeStoredVersion(elements: unknown[]): number {
  let sum = 0;
  for (const el of elements) {
    if (!isRecord(el)) continue;
    const v = el["version"];
    if (typeof v === "number") sum += v;
  }
  return sum;
}
