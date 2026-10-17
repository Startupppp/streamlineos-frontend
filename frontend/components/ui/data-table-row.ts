/**
 * A row checkbox announced as "Select row" is indistinguishable from every
 * other one in the table, so a screen-reader user has nothing to confirm which
 * row they just selected. `selection.getRowLabel` supplies the row's own
 * subject; the generic wording survives only where a call site has not given
 * one yet, and `design-system-control-names.contract` counts those.
 */
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

/**
 * Where `mobileCard` swaps with the table. Literal classes so Tailwind emits
 * them. `xl` suits tables whose last column holds actions that a sidebar-open
 * 768-1024px layout would clip.
 */
export const MOBILE_CARD_BREAKPOINT: Record<"sm" | "xl", { cards: string; table: string }> = {
  sm: { cards: "sm:hidden", table: "hidden sm:block" },
  xl: { cards: "xl:hidden", table: "hidden xl:block" },
};
