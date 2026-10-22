import type { RecordLayout } from "../../layout";


export interface LeadSourceRecord {
  readonly source: string;
  readonly count: number;
  readonly converted: number;
  readonly conversionRate: number;
  readonly totalValue: number;
}

export function sourceLabel(source: string): string {
  const spaced = source.replace(/_/g, " ").trim();
  if (!spaced) return "Unknown";
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function sourceAttributionFields(row: LeadSourceRecord): Record<string, unknown> {
  return {
    sourceKey: row.source,
    source: sourceLabel(row.source),
    count: row.count,
    converted: row.converted,
    conversionRate: row.conversionRate,
    totalValue: row.totalValue,
    averageValue: row.count > 0 ? Math.round(row.totalValue / row.count) : null,
  };
}

export const SOURCE_ATTRIBUTION_LAYOUT: RecordLayout = {
  key: "crm:source-attribution",
  singular: "Source",
  plural: "Sources",
  titleField: "source",
  fields: [
    { name: "source", label: "Source", kind: "text", readOnly: true },
    { name: "count", label: "Leads", kind: "number", readOnly: true },
    { name: "converted", label: "Converted", kind: "number", readOnly: true },
    {
      name: "conversionRate",
      label: "Conv. rate",
      kind: "percent",
      readOnly: true,
        No `sign`. A sign pivots on zero, and a conversion rate never crosses it —
        declaring it a gain paints 3% the same green as 90% and reserves neutral
        for nobody-converted-anything, which tells a reader less than plain text
        does. What this column actually invites is a threshold judgement, and
        `deal-aging-layout.ts` records why a threshold is not a sign: it belongs in
        a derived badge with a word in it, not in a tinted number.
    },
    { name: "totalValue", label: "Total value", kind: "money", readOnly: true },
    { name: "averageValue", label: "Avg value", kind: "money", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search sources…",
    columns: [
      { field: "source", primary: true },
      { field: "count", width: "w-20 shrink-0" },
      { field: "converted", width: "w-24 shrink-0" },
      { field: "conversionRate", width: "w-24 shrink-0" },
      { field: "totalValue", width: "w-32 shrink-0" },
      { field: "averageValue", width: "w-32 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Source", fields: ["source"] },
      { title: "Volume", fields: ["count", "converted", "conversionRate"] },
      { title: "Value", fields: ["totalValue", "averageValue"] },
    ],
  },
  form: { sections: [] },
};
