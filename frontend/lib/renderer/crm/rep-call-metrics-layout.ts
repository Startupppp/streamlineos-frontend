import type { RecordLayout } from "../layout";

/**
 * How each person's calls went, as data.
 *
 * A coaching row is an aggregate — a rep, their medians over the window, and the
 * shape of one of those medians over time — and an aggregate is describable:
 * `deal-aging-layout.ts` made that argument first and this is the second case of
 * it. What makes this one different is `talkRatioTrend`, a `series`: the field's
 * value is a run of figures rather than one, and the surface draws it because
 * what those figures *mean* (basis points, weekly buckets, a gap where nobody
 * called anybody) is domain the engine does not have.
 *
 * **No column is sortable, and that is the ticket rather than an omission.**
 * `DataTable` sorts client-side the moment a column declares `sortable`, and a
 * sortable talk-ratio column is a league table — the thing
 * `call-coaching.controller.ts` refuses to build, arrived at through a prop. The
 * server returns rows in call-count order, which says how much of the window is
 * about each person, and the description carries that order through by declaring
 * nothing sortable. A single `sortable: true` added here later would turn a
 * coaching table into a league table with no other visible change.
 *
 * **No column ever renders a raw id.** `repName` is null for somebody who has
 * left, and `repCallMetricsRecordFields` answers that with the words "Former
 * member". A visible identifier in a coaching table is both a house rule and a
 * bad answer to "who is this row about".
 *
 * The three ratios are text that is aligned like a figure rather than `percent`
 * fields. The API counts every ratio in basis points and the rounding is a
 * decision made once, in `call-metric-format.ts`: a whole percent, because a
 * talk ratio reading 62% on one screen and 61.5% on another is a bug report
 * nobody can reproduce. A `percent` field would re-round it here and undo that.
 * `numeric` is how a description says "line this column up" without claiming the
 * value is a number that could be summed or signed.
 *
 * `embargoed` is a column and not hidden. A manager reading "6 calls" for a rep
 * who made eight needs to know the other two are the rep's to see first;
 * without it the median silently describes a period that is not the one in the
 * heading. It renders as nothing when zero — there is no embargo to report, and
 * a "0" in that column reads as a claim rather than an absence.
 */
export const REP_CALL_METRICS_LAYOUT: RecordLayout = {
  key: "crm:rep-call-metrics",
  singular: "Rep",
  plural: "Rep call metrics",
  titleField: "rep",
  fields: [
    { name: "rep", label: "Rep", kind: "text", readOnly: true },
    { name: "callsAnalysed", label: "Calls", kind: "number", readOnly: true },
    { name: "talkRatio", label: "Talk ratio", kind: "text", numeric: true, readOnly: true },
    {
      name: "questionRate",
      label: "Questions / 10 turns",
      kind: "text",
      numeric: true,
      readOnly: true,
    },
    { name: "nextStep", label: "Next step", kind: "text", numeric: true, readOnly: true },
    { name: "talkRatioTrend", label: "Talk ratio trend", kind: "series", readOnly: true },
    { name: "embargoed", label: "Still private", kind: "number", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search reps…",
    columns: [
      { field: "rep", primary: true },
      { field: "callsAnalysed", width: "w-20 shrink-0" },
      { field: "talkRatio", width: "w-28 shrink-0" },
      { field: "questionRate", width: "w-40 shrink-0" },
      { field: "nextStep", width: "w-28 shrink-0" },
      { field: "talkRatioTrend", width: "w-32 shrink-0" },
      { field: "embargoed", width: "w-28 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Calls", fields: ["rep", "callsAnalysed", "embargoed"] },
      { title: "Medians", fields: ["talkRatio", "questionRate", "nextStep"] },
    ],
  },
  /*
    Nothing about a coaching row is editable: it is a projection over analyses
    the server computes, and the way to change it is to have a different
    conversation.
  */
  form: { sections: [] },
};
