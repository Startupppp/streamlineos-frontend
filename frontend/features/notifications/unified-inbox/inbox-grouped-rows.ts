import type { UnifiedInboxItem } from "@/types/inbox";
import type { InboxGroup } from "./inbox-grouping";

export type FlatRow =
  | { type: "header"; label: string; count: number; groupKey: string }
  | { type: "item"; item: UnifiedInboxItem };

export const ITEM_ROW_HEIGHT = 96;
export const HEADER_ROW_HEIGHT = 40;

export function rowHeightFor(row: FlatRow | undefined): number {
  if (!row || row.type === "item") return ITEM_ROW_HEIGHT;
  return HEADER_ROW_HEIGHT;
}

export function buildFlatRows(groups: InboxGroup[]): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const group of groups) {
    rows.push({
      type: "header",
      label: group.label,
      count: group.items.length,
      groupKey: group.key,
    });
    for (const item of group.items) {
      rows.push({ type: "item", item });
    }
  }
  return rows;
}
