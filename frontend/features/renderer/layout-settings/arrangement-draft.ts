import type { RecordLayout, SectionSpec } from "@/lib/renderer/layout";
import { isHidable, type LayoutAdjustment } from "@/lib/renderer/layout-adjustment";

/**
 * The arrangement an administrator is editing, before they save it.
 *
 * A flat row per field rather than the stored shape, because that is what the
 * screen manipulates: one line you can move up, switch off, or drop into a
 * section. The stored shape is derived on save, so the editor never has to keep
 * three lists in step with each other.
 */
export interface FieldRowDraft {
  readonly name: string;
  readonly label: string;
  readonly hidden: boolean;
  /** Empty means the field keeps whichever section the description gave it. */
  readonly group: string;
  /** False for the title field and for required fields. */
  readonly hidable: boolean;
}

export const NO_GROUP = "";

function declaredGroupOf(layout: RecordLayout, name: string): string {
  const section = layout.detail.sections.find((candidate) =>
    candidate.fields.includes(name),
  );
  return section?.title ?? NO_GROUP;
}

/** The declared group titles, in declared order, with no duplicates. */
export function declaredGroups(layout: RecordLayout): string[] {
  return [...new Set(layout.detail.sections.map((section) => section.title))];
}

/**
 * Opens the editor on what the tenant currently sees.
 *
 * Built from the *unadjusted* description plus the stored arrangement, never
 * from an already-adjusted layout: an adjusted layout has the hidden fields
 * taken out of it, and an editor that could not see them would give a tenant no
 * way to unhide anything.
 */
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

/**
 * The stored shape, derived from the rows.
 *
 * Groups are emitted in the order the fields appear, so a section a tenant
 * dragged to the top of the list becomes the first section on the record.
 */
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
