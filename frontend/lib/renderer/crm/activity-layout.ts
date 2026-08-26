import type { RecordLayout, SelectOption } from "../layout";

/**
 * A logged activity, as data.
 *
 * The activity types are the tenant's own — declared in CRM options, not by us —
 * so the description is completed at the point of use rather than frozen here.
 * That is the same move the issues surface makes with a server-sent layout, and
 * it is what "the layout is data" is for: a select whose options a tenant edits
 * does not need a screen written for it.
 */
export const ACTIVITY_LAYOUT: RecordLayout = {
  key: "crm:activity",
  singular: "Activity",
  plural: "Activities",
  titleField: "title",
  fields: [
    { name: "title", label: "Title", kind: "text", required: true },
    { name: "type", label: "Activity type", kind: "select", options: [] },
    {
      name: "entityType",
      label: "Related to",
      kind: "select",
      hint: "Leave blank to log an activity that stands on its own.",
      options: [
        { value: "LEAD", label: "Lead" },
        { value: "DEAL", label: "Deal" },
        { value: "CONTACT", label: "Contact" },
      ],
    },
    { name: "entityId", label: "Record", kind: "number" },
    { name: "dueDate", label: "Due", kind: "date" },
    { name: "notes", label: "Notes", kind: "longText" },
    { name: "createdAt", label: "Logged", kind: "dateTime", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search activities…",
    columns: [
      { field: "title", primary: true, sortable: true },
      { field: "type", width: "w-32 shrink-0" },
      { field: "dueDate", sortable: true, width: "w-32 shrink-0" },
      { field: "createdAt", sortable: true, width: "w-44 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Activity", fields: ["title", "type"] },
      { title: "Linked", fields: ["entityType", "entityId"] },
      { title: "When", fields: ["dueDate", "createdAt"] },
      { title: "Notes", fields: ["notes"] },
    ],
  },
  form: {
    sections: [
      { title: "Activity", fields: ["type", "title"] },
      { title: "Linked", fields: ["entityType", "entityId"] },
      { title: "When and what", fields: ["dueDate", "notes"] },
    ],
  },
};

/** The description with the tenant's own activity types filled in. */
export function activityLayoutWithTypes(types: readonly SelectOption[]): RecordLayout {
  return {
    ...ACTIVITY_LAYOUT,
    fields: ACTIVITY_LAYOUT.fields.map((field) =>
      field.name === "type" ? { ...field, options: types } : field,
    ),
  };
}
