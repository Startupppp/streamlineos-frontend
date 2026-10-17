import type { RecordLayout } from "../layout";

/**
 * A feedback submission in a managed product's inbox, as data.
 *
 * Read-only: submissions arrive from widgets and captures, and are triaged
 * through the pane and row actions rather than a form. Type, channel, status and
 * sentiment are badges whose tones mirror `product-feedback-model.ts`, so the
 * engine draws what the hand-written badges drew.
 *
 * `customerName`, `age`, `updated` and `linkedOpportunities` are derived by the
 * surface (a customer falls back to its segment, an age is relative), which is
 * why they are text. `reports` is the submission plus its duplicates; the surface
 * draws it as the frequency badge through `cells`, because how many reports earn
 * which tone is a threshold the feedback model owns.
 */
export const PRODUCT_FEEDBACK_LAYOUT: RecordLayout = {
  key: "build:managed-products:feedback",
  singular: "Feedback submission",
  plural: "Feedback submissions",
  titleField: "message",
  fields: [
    {
      name: "type",
      label: "Type",
      kind: "badge",
      readOnly: true,
      options: [
        { value: "bug", label: "Bug", tone: "danger" },
        { value: "idea", label: "Idea", tone: "info" },
        { value: "feature", label: "Feature", tone: "info" },
        { value: "question", label: "Question", tone: "neutral" },
        { value: "praise", label: "Praise", tone: "success" },
        { value: "other", label: "Other", tone: "neutral" },
      ],
    },
    { name: "message", label: "Request", kind: "longText", readOnly: true },
    {
      name: "sourceChannel",
      label: "Channel",
      kind: "badge",
      readOnly: true,
      options: [
        { value: "feedbucket", label: "Feedbucket", tone: "info" },
        { value: "widget", label: "Widget", tone: "info" },
        { value: "email", label: "Email", tone: "neutral" },
        { value: "support", label: "Support", tone: "neutral" },
        { value: "sales", label: "Sales", tone: "neutral" },
        { value: "interview", label: "Interview", tone: "info" },
        { value: "survey", label: "Survey", tone: "info" },
        { value: "public_portal", label: "Portal", tone: "neutral" },
        { value: "manual", label: "Manual", tone: "neutral" },
        { value: "import", label: "Import", tone: "neutral" },
      ],
    },
    { name: "customerName", label: "Customer", kind: "text", readOnly: true },
    { name: "reports", label: "Freq", kind: "number", readOnly: true },
    { name: "theme", label: "Theme", kind: "text", readOnly: true },
    {
      name: "sentiment",
      label: "Sentiment",
      kind: "badge",
      readOnly: true,
      options: [
        { value: "positive", label: "Positive", tone: "success" },
        { value: "neutral", label: "Neutral", tone: "neutral" },
        { value: "negative", label: "Negative", tone: "danger" },
        { value: "mixed", label: "Mixed", tone: "warning" },
      ],
    },
    {
      name: "status",
      label: "Status",
      kind: "badge",
      readOnly: true,
      options: [
        { value: "open", label: "Open", tone: "info" },
        { value: "in_progress", label: "In Progress", tone: "warning" },
        { value: "resolved", label: "Resolved", tone: "success" },
        { value: "archived", label: "Archived", tone: "neutral" },
      ],
    },
    { name: "linkedTicketKey", label: "Linked", kind: "text", readOnly: true },
    { name: "linkedOpportunities", label: "Linked opportunities", kind: "text", readOnly: true },
    { name: "age", label: "Age", kind: "text", readOnly: true },
    { name: "updated", label: "Updated", kind: "text", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search feedback…",
    columns: [
      { field: "type", width: "w-24 shrink-0" },
      { field: "message", primary: true },
      { field: "sourceChannel", width: "w-24 shrink-0" },
      { field: "customerName", width: "w-32 shrink-0" },
      { field: "reports", width: "w-24 shrink-0" },
      { field: "theme", width: "w-32 shrink-0" },
      { field: "sentiment", width: "w-24 shrink-0" },
      { field: "status", width: "w-28 shrink-0" },
      { field: "linkedTicketKey", width: "w-28 shrink-0", subtitle: "linkedOpportunities" },
      { field: "age", width: "w-24 shrink-0" },
      { field: "updated", width: "w-24 shrink-0" },
    ],
  },
  detail: {
    sections: [
      {
        title: "Submission",
        fields: [
          "message",
          "type",
          "status",
          "sourceChannel",
          "customerName",
          "reports",
          "theme",
          "sentiment",
          "linkedTicketKey",
          "linkedOpportunities",
          "age",
          "updated",
        ],
      },
    ],
  },
  form: { sections: [] },
};
