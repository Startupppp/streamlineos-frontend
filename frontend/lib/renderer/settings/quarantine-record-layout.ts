import type { RecordLayout } from "../layout";

/**
 * An upload held for malware scanning, as data.
 *
 * The scanner files these and an administrator releases, rejects or deletes
 * one through row actions, so the form is empty. `filename`, `fileSizeBytes`
 * and `uploadedBy` are declared so the columns exist and can be arranged; the
 * surface draws them through `cells`, because the file line carries its MIME
 * type and any threat name beneath it, a size is bytes shown humanised, and
 * the uploader is shown by name.
 */
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
