import type { RecordLayout } from "../layout";

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
  form: { sections: [] },
};
