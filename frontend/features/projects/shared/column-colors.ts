const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const COLUMN_COLORS = [
  "#3b82f6",
  "#2563eb",
  "#1d4ed8",
  "#06b6d4",
  "#0891b2",
  "#0ea5e9",
  "#22c55e",
  "#16a34a",
  "#10b981",
  "#14b8a6",
  "#84cc16",
  "#65a30d",
  "#eab308",
  "#f59e0b",
  "#f97316",
  "#ea580c",
  "#fb923c",
  "#fbbf24",
  "#ef4444",
  "#dc2626",
  "#f43f5e",
  "#ec4899",
  "#db2777",
  "#e11d48",
  "#8b5cf6",
  "#7c3aed",
  "#6366f1",
  "#4f46e5",
  "#a855f7",
  "#9333ea",
  "#94a3b8",
  "#64748b",
  "#475569",
  "#334155",
  "#1e293b",
  "#0b1220",
] as const;

export type ColumnColor = (typeof COLUMN_COLORS)[number];

export const DEFAULT_COLUMN_COLOR: ColumnColor = COLUMN_COLORS[0];

export const FALLBACK_COLUMN_COLOR = "#94a3b8";

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  if (HEX_COLOR.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (HEX_COLOR.test(withHash)) {
    return withHash.toLowerCase();
  }
  return null;
}

export function resolveColumnColor(value: string | null | undefined): string {
  if (value && isValidHexColor(value)) {
    return value;
  }
  return FALLBACK_COLUMN_COLOR;
}
