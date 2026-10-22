import type { RecordLayout, SectionSpec } from "@/lib/renderer/layout";
import { isHidable, type LayoutAdjustment } from "@/lib/renderer/layout-adjustment";

export interface FieldRowDraft {
  readonly name: string;
  readonly label: string;
  readonly hidden: boolean;
  readonly group: string;
  readonly hidable: boolean;
}

export const NO_GROUP = "";

function declaredGroupOf(layout: RecordLayout, name: string): string {
  const section = layout.detail.sections.find((candidate) =>
    candidate.fields.includes(name),
  );
  return section?.title ?? NO_GROUP;
}

export function declaredGroups(layout: RecordLayout): string[] {
  return [...new Set(layout.detail.sections.map((section) => section.title))];
}

export function draftFrom(
  layout: RecordLayout,
  adjustment: LayoutAdjustment | null | undefined,
): FieldRowDraft[] {
  const hidden = new Set(adjustment?.hidden ?? []);
  const groupByField = new Map<string, string>();
  for (const group of adjustment?.groups ?? [])
    for (const name of group.fields) groupByField.set(name, group.title);

  const rows = layout.fields.map((field) => ({
    name: field.name,
    label: field.label,
    hidden: hidden.has(field.name) && isHidable(layout, field.name),
    group: groupByField.get(field.name) ?? declaredGroupOf(layout, field.name),
    hidable: isHidable(layout, field.name),
  }));

  const order = adjustment?.order ?? [];
  if (order.length === 0) return rows;

  const rank = new Map(order.map((name, index) => [name, index]));
  const named = rows.filter((row) => rank.has(row.name));
  const rest = rows.filter((row) => !rank.has(row.name));
  named.sort((a, b) => (rank.get(a.name) ?? 0) - (rank.get(b.name) ?? 0));
  return [...named, ...rest];
}

export function moveRow(rows: readonly FieldRowDraft[], index: number, by: number): FieldRowDraft[] {
  const target = index + by;
  if (target < 0 || target >= rows.length) return [...rows];
  const next = [...rows];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}

export function setHidden(
  rows: readonly FieldRowDraft[],
  name: string,
  hidden: boolean,
): FieldRowDraft[] {
  return rows.map((row) =>
    row.name === name && row.hidable ? { ...row, hidden } : row,
  );
}

export function setGroup(
  rows: readonly FieldRowDraft[],
  name: string,
  group: string,
): FieldRowDraft[] {
  return rows.map((row) => (row.name === name ? { ...row, group } : row));
}

export function adjustmentFrom(
  layout: RecordLayout,
  rows: readonly FieldRowDraft[],
): LayoutAdjustment {
  const groups: SectionSpec[] = [];
  const byTitle = new Map<string, string[]>();

  for (const row of rows) {
    if (!row.group) continue;
    const existing = byTitle.get(row.group);
    if (existing) {
      existing.push(row.name);
      continue;
    }
    const fields: string[] = [row.name];
    byTitle.set(row.group, fields);
    groups.push({ title: row.group, fields });
  }

  return {
    layoutKey: layout.key,
    order: rows.map((row) => row.name),
    hidden: rows.filter((row) => row.hidden).map((row) => row.name),
    groups: groups.map((group) => ({ title: group.title, fields: [...group.fields] })),
  };
}
