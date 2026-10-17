import type { RecordLayout } from "../layout";

/**
 * A project linked to a managed product, as the product's Projects tab lists it.
 *
 * Read-only: linking, unlinking and choosing the primary product happen through
 * row actions and dialogs, not a form. Most values are embedded objects
 * (next milestone, next release, contribution, linked goals) whose drawing is
 * domain the engine does not have, so the surface supplies those through
 * `RecordList`'s `cells`. Status and health still carry their options so a
 * stored arrangement, the mobile card and any text reading get the labels.
 */
export const PRODUCT_LINKED_PROJECT_LAYOUT: RecordLayout = {
  key: "build:managed-products:linked-project",
  singular: "Linked project",
  plural: "Linked projects",
  titleField: "name",
  fields: [
    { name: "name", label: "Project", kind: "text", readOnly: true },
    { name: "key", label: "Key", kind: "text", readOnly: true },
    {
      name: "status",
      label: "Status",
      kind: "badge",
      readOnly: true,
      options: [
        { value: "ACTIVE", label: "In progress" },
        { value: "PLANNING", label: "Planning" },
        { value: "COMPLETED", label: "Completed" },
        { value: "ON_HOLD", label: "On hold" },
        { value: "ARCHIVED", label: "Archived" },
      ],
    },
    {
      name: "health",
      label: "Health",
      kind: "badge",
      readOnly: true,
      options: [
        { value: "on_track", label: "On track" },
        { value: "at_risk", label: "At risk" },
        { value: "off_track", label: "Off track" },
      ],
    },
    { name: "nextMilestone", label: "Next milestone", kind: "text", readOnly: true },
    { name: "nextRelease", label: "Next release", kind: "text", readOnly: true },
    { name: "linkedGoals", label: "Linked goals", kind: "text", readOnly: true },
    { name: "contribution", label: "Contribution", kind: "text", readOnly: true },
    { name: "startDate", label: "Dates", kind: "date", readOnly: true },
    { name: "endDate", label: "End date", kind: "date", readOnly: true },
    { name: "linkedRoadmapItemCount", label: "Roadmap items", kind: "number", readOnly: true },
    { name: "sourceFreshness", label: "Data freshness", kind: "dateTime", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search projects…",
    columns: [
      { field: "name", primary: true },
      { field: "status" },
      { field: "health" },
      { field: "nextMilestone" },
      { field: "nextRelease" },
      { field: "linkedGoals" },
      { field: "contribution" },
      { field: "startDate" },
      { field: "linkedRoadmapItemCount" },
      { field: "sourceFreshness" },
    ],
  },
  detail: {
    sections: [
      {
        title: "Project",
        fields: ["name", "key", "status", "health", "startDate", "endDate"],
      },
      {
        title: "Delivery",
        fields: [
          "nextMilestone",
          "nextRelease",
          "linkedGoals",
          "contribution",
          "linkedRoadmapItemCount",
          "sourceFreshness",
        ],
      },
    ],
  },
  form: { sections: [] },
};
