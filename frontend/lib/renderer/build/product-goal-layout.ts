import type { RecordLayout } from "../layout";

/**
 * A goal, as the table view of a managed product's Goals tab lists it.
 *
 * Read-only: goals are created and edited from their own detail page, so this
 * description carries no form. `owner` is an embedded person and `progress`
 * is drawn as a bar, so the surface supplies both through `RecordList`'s
 * `cells`; the header, order and width still come from here.
 */
export const PRODUCT_GOAL_LAYOUT: RecordLayout = {
  key: "build:managed-products:goal",
  singular: "Goal",
  plural: "Goals",
  titleField: "title",
  fields: [
    { name: "title", label: "Title", kind: "text", readOnly: true },
    {
      name: "level",
      label: "Level",
      kind: "badge",
      readOnly: true,
      options: [
        { value: "company", label: "Company", tone: "neutral" },
        { value: "team", label: "Team", tone: "neutral" },
        { value: "individual", label: "Individual", tone: "neutral" },
      ],
    },
    {
      name: "status",
      label: "Status",
      kind: "badge",
      readOnly: true,
      options: [
        { value: "not_started", label: "Not Started", tone: "neutral" },
        { value: "on_track", label: "On Track", tone: "success" },
        { value: "at_risk", label: "At Risk", tone: "warning" },
        { value: "off_track", label: "Off Track", tone: "danger" },
        { value: "completed", label: "Completed", tone: "info" },
      ],
    },
    { name: "owner", label: "Owner", kind: "text", readOnly: true },
    { name: "progress", label: "Progress", kind: "percent", readOnly: true },
    { name: "keyResultCount", label: "KRs", kind: "number", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search goals…",
    columns: [
      { field: "title", primary: true },
      { field: "level", width: "w-28 shrink-0" },
      { field: "status", width: "w-28 shrink-0" },
      { field: "owner" },
      { field: "progress", width: "w-32 shrink-0" },
      { field: "keyResultCount", width: "w-16 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Goal", fields: ["title", "level", "status", "owner", "progress", "keyResultCount"] },
    ],
  },
  form: { sections: [] },
};
