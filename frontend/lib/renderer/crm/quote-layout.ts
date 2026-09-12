import type { Quote, QuoteListItem } from "@/types/crm/quotes";
import type { RecordLayout } from "../layout";

/**
 * Quotes, as data.
 *
 * The list and the detail view both come from here. The create and edit sheet
 * does not, and cannot: a quote's form is a line-item grid — an array of
 * sub-records whose quantities and discounts move a running total as they are
 * typed — and a layout description has no vocabulary for that, nor should it. A
 * description that could express an editable sub-table would be a description of
 * a screen rather than of a record. The quote sheet stays hand-written and stays
 * the exception, stated here so nobody has to guess whether it was missed.
 *
 * Every money field reads its currency from the quote rather than from the
 * organisation. A quote is written in the currency the customer buys in and
 * stores it; rendering that in the tenant's own symbol would not be a formatting
 * slip, it would state a different price.
 *
 * The four money fields are the server's own arithmetic, not the client's:
 * `totalAmount` is the sum of the line amounts, and `netAmount` is that less the
 * discount plus the tax. The detail view used to recompute the subtotal from the
 * line items beside these, which is two arithmetics over one quote and one of
 * them wrong the moment a line is rounded differently. The description names the
 * stored figures, so there is only one.
 *
 * The deal and the client are described rather than hand-written. They were a
 * card beside the generated view for exactly as long as a described reference
 * rendered as dead text; now that `renderFieldValue` resolves one to a route,
 * the navigation survives being described and the card is gone.
 *
 * They point at `dealId` and `clientId` — the quote's own foreign keys — rather
 * than at the nested `deal.id` the old card used. The difference shows when the
 * join comes back empty: the key is still there, so the reference still renders
 * the fact that this quote belongs to something, where the card rendered
 * nothing at all. `referenceLabel` names the sibling carrying the human name,
 * which the same read already sends, so no second call buys the label.
 *
 * The list keeps `dealName` and `clientName` as plain text columns. A row there
 * is already a link to the quote, and a link inside a clickable row is two
 * targets in one place — the reference earns its route on the detail view,
 * where the row is not itself a destination.
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
      // First, so it sits directly under the line items it sums.
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
  /*
    Empty because the quote form is the one surface in CRM a description cannot
    produce — see the note above. A form section here would be a second, poorer
    way to edit a quote that silently dropped its line items.
  */
  form: { sections: [] },
};

/**
 * A quote row in the shape the description names.
 *
 * The deal, the client and the author arrive nested; a description names fields,
 * not paths. Flattening here rather than teaching the engine to walk a path: a
 * layout that could address `deal.name` would be a layout that knows what a
 * quote is joined to, and every list would then carry its own little query
 * language.
 */
export function quoteListRecordFields(quote: QuoteListItem): Record<string, unknown> {
  return {
    ...quote,
    dealName: quote.deal?.name ?? "",
    clientName: quote.client?.clientName ?? "",
    createdByName: quote.createdBy?.name ?? "",
  };
}

/** The same, for the fuller record the detail endpoint sends. */
export function quoteRecordFields(quote: Quote): Record<string, unknown> {
  return {
    ...quote,
    dealName: quote.deal?.name ?? "",
    clientName: quote.client?.clientName ?? "",
    createdByName: quote.createdBy?.name ?? "",
  };
}
