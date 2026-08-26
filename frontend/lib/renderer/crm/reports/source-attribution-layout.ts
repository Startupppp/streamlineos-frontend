import type { RecordLayout } from "../../layout";

/**
 * Where leads came from, as data.
 *
 * A source row is an aggregate — a channel plus a period — and it is a record in
 * every way that matters to a table: it has a name, four figures and one
 * verdict. The hand-written card it replaces read the tenant's money through a
 * `formatCurrency` that printed ₹ whatever currency the organisation keeps its
 * books in, which is not a formatting slip but a different number.
 *
 * `conversionRate` is the row's only verdict and carries `sign: "gain"`. The
 * card previously coloured it from thresholds baked into one cell renderer —
 * green at fifty, amber at twenty-five, grey below — and thresholds are a
 * screen's opinion, not the field's meaning. What the description can say is
 * which direction is good news, and it says that.
 *
 * `count` and `converted` deliberately carry no sign. Both are counts, and a
 * count is arithmetic: it can be large or small, but it is never good or bad
 * news on its own, and the previous card's green on `converted` claimed
 * otherwise on every row that had any.
 *
 * `averageValue` is derived here rather than in a cell, because it is a property
 * of the row rather than of the table that happens to show it — a second
 * surface computing it slightly differently is exactly what a description is
 * for.
 */

/** One row of the source report, as the endpoint sends it. */
export interface LeadSourceRecord {
  readonly source: string;
  readonly count: number;
  readonly converted: number;
  readonly conversionRate: number;
  readonly totalValue: number;
}

/**
 * A stored source key as a person would say it.
 *
 * The API stores `google_ads`; a table showing that has rendered an identifier
 * at somebody. Done here rather than with a `capitalize` class so the value
 * exports, sorts and searches the way it reads.
 */
export function sourceLabel(source: string): string {
  const spaced = source.replace(/_/g, " ").trim();
  if (!spaced) return "Unknown";
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** One source row in the shape the description names, average included. */
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
      /*
        No `sign`. A sign pivots on zero, and a conversion rate never crosses it —
        declaring it a gain paints 3% the same green as 90% and reserves neutral
        for nobody-converted-anything, which tells a reader less than plain text
        does. What this column actually invites is a threshold judgement, and
        `deal-aging-layout.ts` records why a threshold is not a sign: it belongs in
        a derived badge with a word in it, not in a tinted number.
      */
    },
    { name: "totalValue", label: "Total value", kind: "money", readOnly: true },
    { name: "averageValue", label: "Avg value", kind: "money", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search sources…",
    columns: [
      { field: "source", primary: true, sortable: true },
      { field: "count", sortable: true, width: "w-20 shrink-0" },
      { field: "converted", sortable: true, width: "w-24 shrink-0" },
      { field: "conversionRate", sortable: true, width: "w-24 shrink-0" },
      { field: "totalValue", sortable: true, width: "w-32 shrink-0" },
      { field: "averageValue", sortable: true, width: "w-32 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Source", fields: ["source"] },
      { title: "Volume", fields: ["count", "converted", "conversionRate"] },
      { title: "Value", fields: ["totalValue", "averageValue"] },
    ],
  },
  /*
    A source row is counted, not kept: it exists because leads name a source,
    and it changes when they do. There is nothing here to edit.
  */
  form: { sections: [] },
};
