import { isHidable, type LayoutAdjustment } from "./layout-adjustment";
import type { RecordLayout } from "./layout";

/**
 * A layout proposed from what a tenant actually fills in.
 *
 * The alternative to this is a settings screen with forty checkboxes and a
 * paragraph asking an administrator to think about each one, which is the
 * failure "make it configurable" always produces: the work is real, nobody does
 * it, and the default is what everyone lives with anyway. The records already
 * say which fields this organisation uses. Reading them is cheaper than asking,
 * and it is evidence rather than opinion.
 *
 * It proposes; it never applies. An administrator sees what would change and
 * why, and says yes — a system that silently rearranged somebody's screens
 * because a column looked quiet would be worse than one that never offered.
 */

/** Below this many records the sample is noise, and no proposal is offered. */
export const MIN_SAMPLE = 20;

export interface FieldUsage {
  readonly field: string;
  readonly label: string;
  /** Records carrying a value for this field, out of the sample. */
  readonly filled: number;
  /** `filled / sample`, 0 to 1. */
  readonly rate: number;
  readonly hidable: boolean;
}

export interface LayoutProposal {
  readonly adjustment: LayoutAdjustment;
  readonly sample: number;
  /** Every field with its fill rate, most-used first — the argument, shown. */
  readonly usage: readonly FieldUsage[];
  /** Fields the proposal would hide, because nothing was ever put in them. */
  readonly hiding: readonly string[];
}

/**
 * Reads how often each field is filled and proposes an arrangement, or nothing.
 *
 * Two rules, both deliberately blunt:
 *
 * A field **no record has ever carried a value for** is proposed hidden. Not a
 * threshold — a field used in one record in a hundred is used, and hiding it
 * would cost that one record its data being visible. "Nobody has ever put
 * anything here" is the only signal strong enough to act on without asking.
 *
 * The rest are ordered by how often they are filled, with the title field pinned
 * first. A list whose first column is not the record's name reads as a
 * spreadsheet, and no amount of evidence about fill rates changes that.
 *
 * Takes counts rather than records, because the counting belongs where the
 * records are. A proposal computed from the page of rows a list happens to have
 * loaded is a proposal about page one.
 */
export function proposeFromFill(
  layout: RecordLayout,
  sample: number,
  filledByField: Readonly<Record<string, number>>,
): LayoutProposal | null {
  if (sample < MIN_SAMPLE) return null;

  const usage: FieldUsage[] = layout.fields.map((field) => {
    const filled = filledByField[field.name] ?? 0;
    return {
      field: field.name,
      label: field.label,
      filled,
      rate: filled / sample,
      hidable: isHidable(layout, field.name),
    };
  });

  const hiding = usage
    .filter((entry) => entry.filled === 0 && entry.hidable)
    .map((entry) => entry.field);

  const declared = new Map(layout.fields.map((field, index) => [field.name, index]));
  const ranked = [...usage].sort((a, b) => {
    if (a.field === layout.titleField) return -1;
    if (b.field === layout.titleField) return 1;
    if (b.rate !== a.rate) return b.rate - a.rate;
    // Ties keep the order somebody chose when they wrote the description.
    return (declared.get(a.field) ?? 0) - (declared.get(b.field) ?? 0);
  });

  return {
    adjustment: {
      layoutKey: layout.key,
      order: ranked.map((entry) => entry.field),
      hidden: hiding,
    },
    sample,
    usage: ranked,
    hiding,
  };
}
