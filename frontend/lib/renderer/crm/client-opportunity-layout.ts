import type { RecordLayout } from "../layout";

export const CLIENT_OPPORTUNITY_LAYOUT: RecordLayout = {
  key: "crm:client-opportunity",
  singular: "Opportunity",
  plural: "Opportunities",
  titleField: "title",
  fields: [
    { name: "title", label: "Title", kind: "text", required: true },
    {
      name: "type",
      label: "Type",
      kind: "select",
      options: [
        { value: "upsell", label: "Upsell" },
        { value: "cross_sell", label: "Cross-sell" },
      ],
    },
    {
      name: "stage",
      label: "Stage",
      kind: "badge",
      options: [
        { value: "identified", label: "Identified", tone: "info" },
        { value: "proposed", label: "Proposed", tone: "warning" },
        { value: "negotiating", label: "Negotiating", tone: "neutral" },
        { value: "won", label: "Won", tone: "success" },
        { value: "lost", label: "Lost", tone: "danger" },
      ],
    },
    { name: "value", label: "Value", kind: "money" },
    { name: "expectedCloseDate", label: "Expected close", kind: "date" },
    { name: "notes", label: "Notes", kind: "longText" },
    { name: "createdAt", label: "Added", kind: "date", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search opportunities…",
    columns: [
      { field: "title", primary: true },
      { field: "type", width: "w-28 shrink-0" },
      { field: "stage", width: "w-32 shrink-0" },
      { field: "value", width: "w-32 shrink-0" },
      { field: "expectedCloseDate", width: "w-36 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Opportunity", fields: ["title", "type", "stage"] },
      { title: "Commercials", fields: ["value", "expectedCloseDate"] },
      { title: "Notes", fields: ["notes"] },
      { title: "Record", fields: ["createdAt"] },
    ],
  },
  form: {
    sections: [
      { title: "Opportunity", fields: ["title", "type", "stage"] },
      { title: "Commercials", fields: ["value", "expectedCloseDate"] },
      { title: "Notes", fields: ["notes"] },
    ],
  },
};
