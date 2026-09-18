export const LIST_STYLE_DISC = "disc";
export const LIST_STYLE_DECIMAL = "decimal";
export const LIST_STYLE_TODO = "todo";

export type ListStyleType =
  | typeof LIST_STYLE_DISC
  | typeof LIST_STYLE_DECIMAL
  | typeof LIST_STYLE_TODO;

const LIST_STYLE_TYPES: readonly ListStyleType[] = [
  LIST_STYLE_DISC,
  LIST_STYLE_DECIMAL,
  LIST_STYLE_TODO,
];

export const LIST_INDENT_REM = 1.5;

export interface ListNodeShape {
  listStyleType?: unknown;
  indent?: unknown;
  listStart?: unknown;
  checked?: unknown;
}

export function listStyleTypeOf(node: ListNodeShape): ListStyleType | null {
  const style = node.listStyleType;
  if (typeof style !== "string") return null;
  return LIST_STYLE_TYPES.find(function matches(known) {
    return known === style;
  }) ?? null;
}

export function listIndentOf(node: ListNodeShape): number {
  const indent = node.indent;
  if (typeof indent !== "number" || !Number.isFinite(indent)) return 1;
  return Math.max(1, Math.floor(indent));
}

export function listPaddingRem(node: ListNodeShape): string {
  return `${listIndentOf(node) * LIST_INDENT_REM}rem`;
}

export function listOrdinalOf(node: ListNodeShape): number {
  const start = node.listStart;
  if (typeof start !== "number" || !Number.isFinite(start) || start < 1) return 1;
  return Math.floor(start);
}

export function listOrdinalLabel(node: ListNodeShape): string {
  return `${listOrdinalOf(node)}.`;
}

export function isListItemChecked(node: ListNodeShape): boolean {
  return node.checked === true;
}
