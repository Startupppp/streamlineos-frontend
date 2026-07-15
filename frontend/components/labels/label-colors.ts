const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

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

export const FALLBACK_LABEL_COLOR = DEFAULT_LABEL_COLOR;

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

export function resolveLabelColor(value: string | null | undefined): string {
  if (value && isValidHexColor(value)) {
    return value.toLowerCase();
  }
  return FALLBACK_LABEL_COLOR;
}
