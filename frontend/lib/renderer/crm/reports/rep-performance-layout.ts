import type { FieldSpec, RecordLayout } from "../../layout";

/**
 * A sales rep's leaderboard row.
 *
 * The backend `/leads/sales-leaderboard` returns `{ userId, name, count }` — the
 * count of leads handled by that rep in the requested period. Extended metrics
 * (leadsAssigned, leadsConverted, totalRevenue, score) are not yet emitted by
 * that endpoint and must not be accessed here; doing so produced type errors
 * because `SalesLeaderboardEntry` (derived from the Zod contract) only carries
 * the three fields the API actually sends.
 *
 * Frontend–backend mismatch reported: the layout previously defined
 * `SalesRepPerformance` with leadsAssigned / leadsConverted / totalCalls /
 * totalMeetings / totalEmails / totalRevenue / score — none of which exist in
 * the backend response schema (`leadsSalesLeaderboardSchema`). The interface
 * and the downstream export have been aligned to the real contract.
 */
export interface SalesRepPerformance {
  readonly userId: string;
  readonly name: string | null;
  readonly count: number;
}

/** One leaderboard row in the shape the descriptions name, rank included. */
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

/** What a rep row is, shared by every description of one. */
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
      { field: "name", primary: true, sortable: true },
      { field: "rank", width: "w-16 shrink-0" },
      { field: "count", sortable: true, width: "w-20 shrink-0" },
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
