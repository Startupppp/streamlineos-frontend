import type { RecordLayout } from "../../layout";

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
