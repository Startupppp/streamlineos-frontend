import { isHidable, type LayoutAdjustment } from "./layout-adjustment";
import type { RecordLayout } from "./layout";


export const MIN_SAMPLE = 20;

export interface FieldUsage {
  readonly field: string;
  readonly label: string;
  readonly filled: number;
  readonly rate: number;
  readonly hidable: boolean;
}

export interface LayoutProposal {
  readonly adjustment: LayoutAdjustment;
  readonly sample: number;
  readonly usage: readonly FieldUsage[];
  readonly hiding: readonly string[];
}

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
