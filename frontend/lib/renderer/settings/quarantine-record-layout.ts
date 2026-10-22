import type { RecordLayout } from "../layout";

export const QUARANTINE_RECORD_LAYOUT: RecordLayout = {
  key: "settings:storage-quarantine",
  singular: "Quarantined upload",
  plural: "Quarantined uploads",
  titleField: "filename",
  fields: [
    { name: "filename", label: "File", kind: "text", readOnly: true },
    {
      name: "status",
      label: "Status",
      kind: "badge",
      readOnly: true,
      options: [
        { value: "pending_scan", label: "Awaiting scan", tone: "warning" },
        { value: "clean", label: "Released", tone: "success" },
        { value: "infected", label: "Rejected", tone: "danger" },
        { value: "error", label: "Scan failed", tone: "neutral" },
      ],
    },
    { name: "fileSizeBytes", label: "Size", kind: "number", readOnly: true },
    { name: "uploadedBy", label: "Uploaded by", kind: "text", readOnly: true },
    { name: "createdAt", label: "Uploaded", kind: "dateTime", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search uploads…",
    columns: [
      { field: "filename", primary: true },
      { field: "status", width: "w-32 shrink-0" },
      { field: "fileSizeBytes", width: "w-24 shrink-0" },
      { field: "uploadedBy" },
      { field: "createdAt", width: "w-44 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Upload", fields: ["filename", "status", "fileSizeBytes", "uploadedBy", "createdAt"] },
    ],
  },
  form: { sections: [] },
};
