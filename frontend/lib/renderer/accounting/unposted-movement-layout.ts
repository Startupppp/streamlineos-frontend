import type { RecordLayout } from "../layout";

/**
 * A stock movement that never reached the ledger, as data.
 *
 * A row of the stock-to-GL reconciliation report, so it is a projection and
 * the form is empty. `postingDate` and `valueMinor` are declared so the columns
 * exist and can be arranged; the surface draws their values through `cells`,
 * because the date is a calendar day (a `date` field would parse it as UTC
 * midnight and show the day before west of Greenwich) and the value is in
 * minor units of the book's currency, which `money` does not speak.
 */
export const UNPOSTED_MOVEMENT_LAYOUT: RecordLayout = {
  key: "accounting:unposted-movement",
  singular: "Unposted movement",
  plural: "Unposted movements",
  titleField: "transactionType",
  fields: [
    { name: "postingDate", label: "Date", kind: "text", readOnly: true },
    { name: "transactionType", label: "Movement", kind: "text", readOnly: true },
    { name: "referenceType", label: "Source", kind: "text", readOnly: true },
    {
      name: "reason",
      label: "Why it is not in the ledger",
      kind: "select",
      readOnly: true,
      options: [
        { value: "no_posting_path", label: "No posting rule for this kind of movement" },
        { value: "post_missing", label: "Should have posted and did not" },
        { value: "not_applicable", label: "Never posts (by design)" },
      ],
    },
    { name: "valueMinor", label: "Value", kind: "number", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search movements…",
    columns: [
      { field: "postingDate", width: "w-28 shrink-0" },
      { field: "transactionType", primary: true },
      { field: "referenceType" },
      { field: "reason" },
      { field: "valueMinor", width: "w-32 shrink-0" },
    ],
  },
  detail: {
    sections: [
      {
        title: "Movement",
        fields: ["postingDate", "transactionType", "referenceType", "reason", "valueMinor"],
      },
    ],
  },
  form: { sections: [] },
};
