import type { RecordLayout } from "../layout";

/**
 * A filed data-subject request, as data.
 *
 * Filed by running an export or erasure, never typed in as a record, so the
 * form is empty: running one is `SubjectRequestDialog`'s job. `dueBy` is
 * declared so the column exists; the surface draws it through `cells`,
 * because it is a calendar day and a `date` field would parse it as UTC
 * midnight and show the day before west of Greenwich.
 */
export const SUBJECT_REQUEST_LAYOUT: RecordLayout = {
  key: "settings:privacy-subject-request",
  singular: "Subject request",
  plural: "Subject requests",
  titleField: "subjectEmail",
  fields: [
    {
      name: "kind",
      label: "Request",
      kind: "select",
      readOnly: true,
      options: [
        { value: "erasure", label: "Erasure" },
        { value: "export", label: "Export" },
      ],
    },
    { name: "subjectEmail", label: "Subject", kind: "text", readOnly: true },
    {
      name: "isComplete",
      label: "Status",
      kind: "badge",
      readOnly: true,
      options: [
        { value: "true", label: "Complete", tone: "success" },
        { value: "false", label: "Incomplete", tone: "warning" },
      ],
    },
    { name: "totalRecordsAffected", label: "Records", kind: "number", readOnly: true },
    { name: "requestedAt", label: "Requested", kind: "dateTime", readOnly: true },
    { name: "dueBy", label: "Due", kind: "text", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Filter by exact email",
    columns: [
      { field: "kind", width: "w-24 shrink-0" },
      { field: "subjectEmail", primary: true },
      { field: "isComplete", width: "w-28 shrink-0" },
      { field: "totalRecordsAffected", width: "w-24 shrink-0" },
      { field: "requestedAt", width: "w-44 shrink-0" },
      { field: "dueBy", width: "w-28 shrink-0" },
    ],
  },
  detail: {
    sections: [
      {
        title: "Request",
        fields: ["kind", "subjectEmail", "isComplete", "totalRecordsAffected", "requestedAt", "dueBy"],
      },
    ],
  },
  form: { sections: [] },
};
