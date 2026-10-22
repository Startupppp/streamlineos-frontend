import type { RecordLayout } from "../../layout";

export const DATA_QUALITY_FINDING_LAYOUT: RecordLayout = {
  key: "crm:data-quality-finding",
  singular: "Finding",
  plural: "Findings",
  titleField: "findingKind",
  fields: [
    {
      name: "severity",
      label: "Severity",
      kind: "badge",
      readOnly: true,
      options: [
        { value: "high", label: "High", tone: "danger" },
        { value: "medium", label: "Medium", tone: "warning" },
        { value: "low", label: "Low", tone: "neutral" },
      ],
    },
    { name: "findingKind", label: "Finding", kind: "text", readOnly: true },
    { name: "partyId", label: "Record", kind: "text", readOnly: true },
    { name: "ageDays", label: "Age (days)", kind: "number", readOnly: true },
    { name: "firstDetectedAt", label: "First detected", kind: "date", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search findings…",
    columns: [
      { field: "findingKind", primary: true },
      { field: "severity", width: "w-24 shrink-0" },
      { field: "partyId", width: "min-w-40" },
      { field: "ageDays", width: "w-24 shrink-0" },
      { field: "firstDetectedAt", width: "w-28 shrink-0" },
    ],
  },
  detail: {
    sections: [{ title: "Finding", fields: ["findingKind", "severity", "partyId", "ageDays", "firstDetectedAt"] }],
  },
  form: { sections: [] },
};
