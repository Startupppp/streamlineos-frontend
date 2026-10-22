import type { FieldSpec, RecordLayout } from "../../layout";

export interface SalesRepPerformance {
  readonly userId: string;
  readonly name: string | null;
  readonly count: number;
}

export function repPerformanceFields(
  rep: SalesRepPerformance,
  index: number,
): Record<string, unknown> {
  return {
    userId: rep.userId,
    rank: index + 1,
    name: rep.name ?? "Unknown",
    count: rep.count,
  };
}

export const SALES_REP_FIELDS: readonly FieldSpec[] = [
  { name: "name", label: "Rep", kind: "text", readOnly: true },
  { name: "rank", label: "Rank", kind: "number", readOnly: true },
  { name: "count", label: "Leads", kind: "number", readOnly: true },
];

export const REP_PERFORMANCE_LAYOUT: RecordLayout = {
  key: "crm:rep-performance",
  singular: "Rep",
  plural: "Reps",
  titleField: "name",
  fields: SALES_REP_FIELDS,
  list: {
    searchPlaceholder: "Search reps…",
    columns: [
      { field: "name", primary: true },
      { field: "rank", width: "w-16 shrink-0" },
      { field: "count", width: "w-20 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Rep", fields: ["name", "rank"] },
      { title: "Activity", fields: ["count"] },
    ],
  },
  form: { sections: [] },
};
