import { isValidHexColor } from "@/lib/column-colors";

export const LABEL_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
] as const;

export type LabelColor = (typeof LABEL_COLORS)[number];

export const DEFAULT_LABEL_COLOR: LabelColor = LABEL_COLORS[0];

export function resolveLabelColor(value: string | null | undefined): string {
  if (value && isValidHexColor(value)) {
    return value.toLowerCase();
  }
  return DEFAULT_LABEL_COLOR;
}
