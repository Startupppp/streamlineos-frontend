import type { RecordLayout } from "../layout";

/**
 * Quotes, as data.
 *
 * The list is the whole of what moves onto the engine here. A quote's create and
 * edit form is a line-item grid — an array of sub-records with quantities,
 * discounts and running totals — and a layout description has no vocabulary for
 * that, nor should it: a description that could express an editable sub-table
 * would be a description of a screen rather than of a record. The quote sheet
 * stays hand-written and stays the exception, stated here so nobody has to guess
 * whether it was missed.
 *
 * `netAmount` reads its currency from the quote rather than from the
 * organisation. A quote is written in the currency the customer buys in and
 * stores it; rendering that in the tenant's own symbol would not be a formatting
 * slip, it would state a different price.
 */
export const QUOTE_LAYOUT: RecordLayout = {
  key: "crm:quote",
  singular: "Quote",
  plural: "Quotes",
  titleField: "quoteNumber",
  fields: [
    // Minted by the server on create, so it is never offered as a control.
    { name: "quoteNumber", label: "Quote #", kind: "text", readOnly: true },
    { name: "subject", label: "Subject", kind: "text", required: true },
    { name: "dealName", label: "Deal", kind: "text", readOnly: true },
    { name: "clientName", label: "Client", kind: "text", readOnly: true },
    {
      name: "status",
      label: "Status",
      kind: "badge",
      // A quote's status is moved by sending, accepting or rejecting it, never
      // by editing a field, so there is no control for it.
      readOnly: true,
      options: [
        { value: "DRAFT", label: "Draft", tone: "neutral" },
        { value: "SENT", label: "Sent", tone: "info" },
        { value: "ACCEPTED", label: "Accepted", tone: "success" },
        { value: "REJECTED", label: "Rejected", tone: "danger" },
        { value: "EXPIRED", label: "Expired", tone: "warning" },
      ],
    },
    { name: "currency", label: "Currency", kind: "text", readOnly: true },
    {
      name: "netAmount",
      label: "Amount",
      kind: "money",
      readOnly: true,
      currencyField: "currency",
    },
    {
      name: "totalAmount",
      label: "Total",
      kind: "money",
      readOnly: true,
      currencyField: "currency",
    },
    { name: "validUntil", label: "Valid until", kind: "date" },
    { name: "sentAt", label: "Sent", kind: "date", readOnly: true },
    { name: "acceptedAt", label: "Accepted", kind: "date", readOnly: true },
    { name: "createdAt", label: "Created", kind: "date", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search quotes…",
    columns: [
      { field: "quoteNumber", primary: true, sortable: true, subtitle: "subject" },
      { field: "dealName", width: "min-w-[120px]" },
      { field: "status", width: "w-28 shrink-0" },
      { field: "netAmount", width: "w-32 shrink-0" },
      { field: "validUntil", width: "w-32 shrink-0" },
      { field: "createdAt", sortable: true, width: "w-32 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Quote", fields: ["quoteNumber", "subject", "status"] },
      { title: "Value", fields: ["totalAmount", "netAmount", "currency"] },
      { title: "Linked", fields: ["dealName", "clientName"] },
      { title: "Dates", fields: ["validUntil", "sentAt", "acceptedAt", "createdAt"] },
    ],
  },
  form: {
    sections: [{ title: "Quote", fields: ["subject", "validUntil"] }],
  },
};
