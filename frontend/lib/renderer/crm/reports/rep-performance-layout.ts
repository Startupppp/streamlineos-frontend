import type { FieldSpec, RecordLayout } from "../../layout";

/**
 * A sales rep's performance, as data.
 *
 * An aggregate row is still a record. This one has no id in the domain sense —
 * it is a rep plus a period, computed by the leaderboard endpoint — but it has
 * fields, labels, kinds and alignment, which is everything a description needs.
 * Two hand-written tables rendered it before, and between them they carried a
 * `formatCurrency` that hardcoded ₹, a threshold helper painting conversion
 * rates green above fifty and amber above twenty-five, and a tint on
 * `leadsConverted` that said nothing at all.
 *
 * The field vocabulary is declared once, here, and two descriptions name it:
 * this one for the analytics table, which asks who is working, and
 * `TEAM_LEADERBOARD_LAYOUT` for the reports card, which asks who is winning.
 * They are separate keys on purpose — a tenant who rearranges a leaderboard has
 * rearranged a leaderboard, and finding the analytics table silently reordered
 * with it would be one surface editing another. What they must not do is
 * disagree about what a field *is*, and sharing `SALES_REP_FIELDS` is what stops
 * that.
 *
 * `conversionRate` is derived rather than sent: the endpoint gives assigned and
 * converted, and the ratio between them is the only figure on the row that is a
 * verdict. It carries `sign: "gain"` because a higher rate is better news, and
 * the engine tones it from the status tokens. The counts either side of it carry
 * no sign on purpose — a count of leads is arithmetic, and a table where every
 * number is coloured has told the reader nothing.
 *
 * `score` and `rank` likewise have no sign. A score is a magnitude the server
 * composes from activity and a rank is a place in an ordering; neither crosses
 * zero, so declaring a direction would paint every row the same colour, which is
 * information the row order already carries.
 */

/** The leaderboard row, as much of it as the descriptions name. */
export interface SalesRepPerformance {
  readonly userId: string;
  readonly name: string;
  readonly leadsAssigned: number;
  readonly leadsConverted: number;
  readonly totalCalls: number;
  readonly totalMeetings: number;
  readonly totalEmails: number;
  readonly totalRevenue: number;
  readonly score: number;
}

/**
 * Converted as a share of assigned, or nothing when nothing was assigned.
 *
 * Null rather than zero: a rep who was handed no leads has not converted 0% of
 * them, and rendering "0.0%" puts them at the bottom of a ranking they were
 * never in. The engine renders an absent value as an em dash, which is the
 * honest answer.
 */
export function repConversionRate(assigned: number, converted: number): number | null {
  if (!Number.isFinite(assigned) || assigned <= 0) return null;
  return (converted / assigned) * 100;
}

/** One leaderboard row in the shape the descriptions name, rank included. */
export function repPerformanceFields(
  rep: SalesRepPerformance,
  index: number,
): Record<string, unknown> {
  return {
    userId: rep.userId,
    rank: index + 1,
    name: rep.name,
    leadsAssigned: rep.leadsAssigned,
    leadsConverted: rep.leadsConverted,
    conversionRate: repConversionRate(rep.leadsAssigned, rep.leadsConverted),
    totalCalls: rep.totalCalls,
    totalMeetings: rep.totalMeetings,
    totalEmails: rep.totalEmails,
    totalRevenue: rep.totalRevenue,
    score: rep.score,
  };
}

/** What a rep row is, shared by every description of one. */
export const SALES_REP_FIELDS: readonly FieldSpec[] = [
  { name: "name", label: "Rep", kind: "text", readOnly: true },
  { name: "rank", label: "Rank", kind: "number", readOnly: true },
  { name: "leadsAssigned", label: "Leads", kind: "number", readOnly: true },
  { name: "leadsConverted", label: "Converted", kind: "number", readOnly: true },
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
  { name: "totalCalls", label: "Calls", kind: "number", readOnly: true },
  { name: "totalMeetings", label: "Meetings", kind: "number", readOnly: true },
  { name: "totalEmails", label: "Emails", kind: "number", readOnly: true },
  { name: "totalRevenue", label: "Revenue", kind: "money", readOnly: true },
  { name: "score", label: "Score", kind: "number", readOnly: true },
];

export const REP_PERFORMANCE_LAYOUT: RecordLayout = {
  key: "crm:rep-performance",
  singular: "Rep",
  plural: "Reps",
  titleField: "name",
  fields: SALES_REP_FIELDS,
  list: {
    searchPlaceholder: "Search reps…",
    /*
      `name` leads because the primary column titles the card below the mobile
      breakpoint, and a card titled "3" is a rank with no rep attached to it.
    */
    columns: [
      { field: "name", primary: true },
      { field: "rank", width: "w-16 shrink-0" },
      { field: "leadsAssigned", width: "w-20 shrink-0" },
      { field: "leadsConverted", width: "w-24 shrink-0" },
      { field: "conversionRate", width: "w-24 shrink-0" },
      { field: "totalCalls", width: "w-20 shrink-0" },
      { field: "score", width: "w-20 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Rep", fields: ["name", "rank", "score"] },
      { title: "Pipeline", fields: ["leadsAssigned", "leadsConverted", "conversionRate"] },
      { title: "Activity", fields: ["totalCalls", "totalMeetings", "totalEmails"] },
      { title: "Return", fields: ["totalRevenue"] },
    ],
  },
  /*
    Nothing on a leaderboard row is editable: it is what the server computed
    from leads and activity, and the way to change it is to work a lead. An
    empty form says that; a form of read-only controls would not.
  */
  form: { sections: [] },
};
