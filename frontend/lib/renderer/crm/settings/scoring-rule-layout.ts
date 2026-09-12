import type { RecordLayout } from "../../layout";

/**
 * A lead-scoring rule, as data.
 *
 * `points` declares `sign: "gain"` — more points is better news — and that one
 * word replaces the badge the old table painted by hand, green at or above zero
 * and red below. The engine tones it from the same status tokens a status badge
 * uses, so "this lead is worth more" and "this deal is won" are the same green
 * in both themes, and zero is neither.
 *
 * The screen this replaces also rendered a raw shadcn `<Table>` rather than the
 * platform's one `DataTable`, with its own sticky header and its own `text-micro
 * uppercase` header classes. A generated list cannot do that: there is one
 * table, and the description drives it.
 */
export const SCORING_RULE_LAYOUT: RecordLayout = {
  key: "crm:settings:scoring-rule",
  singular: "Scoring rule",
  plural: "Scoring rules",
  titleField: "field",
  fields: [
    {
      name: "field",
      label: "When",
      kind: "select",
      required: true,
      options: [
        { value: "source", label: "Source" },
        { value: "priority", label: "Priority" },
        { value: "status", label: "Status" },
        { value: "company", label: "Company" },
        { value: "city", label: "City" },
        { value: "potentialValue", label: "Potential value" },
        { value: "investmentInterest", label: "Investment interest" },
      ],
    },
    {
      name: "operator",
      label: "Is",
      kind: "select",
      required: true,
      options: [
        { value: "eq", label: "Equal to" },
        { value: "gt", label: "Greater than" },
        { value: "lt", label: "Less than" },
        { value: "contains", label: "Containing" },
        { value: "in", label: "One of" },
      ],
    },
    {
      name: "value",
      label: "Value",
      kind: "text",
      required: true,
      hint: "For “one of”, separate the choices with commas.",
    },
    {
      name: "points",
      label: "Points",
      kind: "number",
      required: true,
      sign: "gain",
      hint: "Between -1000 and 1000. A negative score is a reason to look elsewhere.",
    },
  ],
  list: {
    searchPlaceholder: "Search rules…",
    columns: [
      { field: "field", primary: true },
      { field: "operator", width: "w-36 shrink-0" },
      { field: "value" },
      { field: "points", width: "w-24 shrink-0" },
    ],
  },
  detail: {
    sections: [{ title: "Rule", fields: ["field", "operator", "value", "points"] }],
  },
  form: {
    sections: [{ title: "Rule", fields: ["field", "operator", "value", "points"] }],
  },
};
