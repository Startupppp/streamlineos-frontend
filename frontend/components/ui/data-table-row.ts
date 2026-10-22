export function selectionRowLabel(rowLabel: string | undefined): string {
  const trimmed = rowLabel?.trim();
  return trimmed ? `Select ${trimmed}` : "Select row";
}

export function readSortKey(row: unknown, key: string): string | number | boolean | null {
  if (row === null || typeof row !== "object") return null;
  const value: unknown = Reflect.get(row, key);
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return null;
}

export const MOBILE_CARD_BREAKPOINT: Record<"sm" | "xl", { cards: string; table: string }> = {
  sm: { cards: "sm:hidden", table: "hidden sm:block" },
  xl: { cards: "xl:hidden", table: "hidden xl:block" },
};
