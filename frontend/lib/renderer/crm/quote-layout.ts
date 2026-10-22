import type { Quote, QuoteListItem } from "@/types/crm/quotes";
import type { RecordLayout } from "../layout";

export const QUOTE_LAYOUT: RecordLayout = {
  key: "crm:quote",
  singular: "Quote",
  plural: "Quotes",
  titleField: "quoteNumber",
  fields: [
    { name: "quoteNumber", label: "Quote #", kind: "text", readOnly: true },
    { name: "subject", label: "Subject", kind: "text", required: true },
    { name: "description", label: "Description", kind: "longText" },
    { name: "dealName", label: "Deal", kind: "text", readOnly: true },
    { name: "clientName", label: "Client", kind: "text", readOnly: true },
    {
      name: "dealId",
      label: "Deal",
      kind: "reference",
      readOnly: true,
      referenceTo: "deal",
      referenceLabel: "dealName",
    },
    {
      name: "clientId",
      label: "Client",
      kind: "reference",
      readOnly: true,
      referenceTo: "client",
      referenceLabel: "clientName",
    },
    {
      name: "status",
      label: "Status",
      kind: "badge",
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
      name: "totalAmount",
      label: "Subtotal",
      kind: "money",
      readOnly: true,
      currencyField: "currency",
    },
    {
      name: "discountAmount",
      label: "Discount",
      kind: "money",
      readOnly: true,
      currencyField: "currency",
    },
    {
      name: "taxAmount",
      label: "Tax",
      kind: "money",
      readOnly: true,
      currencyField: "currency",
    },
    {
      name: "netAmount",
      label: "Total",
      kind: "money",
      readOnly: true,
      currencyField: "currency",
    },
    { name: "validUntil", label: "Valid until", kind: "date" },
    { name: "createdByName", label: "Raised by", kind: "text", readOnly: true },
    { name: "createdAt", label: "Created", kind: "date", readOnly: true },
    { name: "sentAt", label: "Sent", kind: "date", readOnly: true },
    { name: "acceptedAt", label: "Accepted", kind: "date", readOnly: true },
    { name: "rejectedAt", label: "Rejected", kind: "date", readOnly: true },
    { name: "rejectionReason", label: "Rejection reason", kind: "longText", readOnly: true },
    { name: "termsAndConditions", label: "Terms and conditions", kind: "longText" },
    { name: "notes", label: "Notes", kind: "longText" },
  ],
  list: {
    searchPlaceholder: "Search quotes…",
    columns: [
      { field: "quoteNumber", primary: true, subtitle: "subject" },
      { field: "dealName", width: "min-w-[120px]" },
      { field: "clientName", width: "min-w-[120px]" },
      { field: "status", width: "w-28 shrink-0" },
      { field: "netAmount", width: "w-32 shrink-0" },
      { field: "validUntil", width: "w-32 shrink-0" },
      { field: "createdAt", width: "w-32 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Value", fields: ["totalAmount", "discountAmount", "taxAmount", "netAmount"] },
      { title: "Quote", fields: ["subject", "status", "validUntil", "description"] },
      { title: "Linked", fields: ["dealId", "clientId"] },
      {
        title: "History",
        fields: [
          "createdByName",
          "createdAt",
          "sentAt",
          "acceptedAt",
          "rejectedAt",
          "rejectionReason",
        ],
      },
      { title: "Terms", fields: ["termsAndConditions", "notes"] },
    ],
  },
  form: { sections: [] },
};

export function quoteListRecordFields(quote: QuoteListItem): Record<string, unknown> {
  return {
    ...quote,
    dealName: quote.deal?.name ?? "",
    clientName: quote.client?.clientName ?? "",
    createdByName: quote.createdBy?.name ?? "",
  };
}

export function quoteRecordFields(quote: Quote): Record<string, unknown> {
  return {
    ...quote,
    dealName: quote.deal?.name ?? "",
    clientName: quote.client?.clientName ?? "",
    createdByName: quote.createdBy?.name ?? "",
  };
}
