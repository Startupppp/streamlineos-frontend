import type { RecordLayout } from "../layout";

/**
 * Upsell and cross-sell opportunities on a client account, as data.
 *
 * The record the client detail page's Opportunities tab lists. It is a separate
 * description rather than part of `CLIENT_LAYOUT` because it is a separate
 * record: `/clients/opportunities` reads, writes and deletes rows of its own,
 * and folding them into the account's description would say a client has one
 * stage and one value when it has as many as it has opportunities.
 *
 * Two fields the API carries are deliberately not declared. `clientId` is
 * accepted on create and is the account the row hangs off, but the only surface
 * that renders this description is already inside one client — so a picker
 * asking which client would be asking a question the page has answered. And
 * `client.name` arrives nested, which a description cannot name; flattening it
 * would produce a column repeating the same account on every row of a
 * single-account table. Both would be fields nothing renders, which is dead
 * data in a description exactly as it is in code.
 *
 * `value` renders through the organisation's own display rather than the
 * hardcoded `en-IN`/`INR` formatter the hand-written table used, which showed
 * rupees to every tenant regardless of the currency they trade in. It carries no
 * `sign`: an opportunity's value is a quantity, not a verdict about zero, and
 * tinting it would be the engine inventing a judgement the number does not make.
 *
 * Nothing here is `readOnly` except `createdAt`, because
 * `createOpportunitySchema` and `updateOpportunitySchema` both accept every
 * other field. No frontend surface renders the form yet — `hooks/api/crm/clients.ts`
 * wires only the list — so `form.sections` describes a form nothing mounts. That
 * is the description being right about the record rather than about today's
 * screens; wiring the mutation is all a create surface needs.
 */
export const CLIENT_OPPORTUNITY_LAYOUT: RecordLayout = {
  key: "crm:client-opportunity",
  singular: "Opportunity",
  plural: "Opportunities",
  titleField: "title",
  fields: [
    { name: "title", label: "Title", kind: "text", required: true },
    {
      name: "type",
      label: "Type",
      kind: "select",
      /*
        No tones. Upsell and cross-sell are two kinds of the same thing, not two
        verdicts about it, and painting them apart would tell a reader there is
        good news in one of them.
      */
      options: [
        { value: "upsell", label: "Upsell" },
        { value: "cross_sell", label: "Cross-sell" },
      ],
    },
    {
      name: "stage",
      label: "Stage",
      kind: "badge",
      options: [
        { value: "identified", label: "Identified", tone: "info" },
        { value: "proposed", label: "Proposed", tone: "warning" },
        { value: "negotiating", label: "Negotiating", tone: "neutral" },
        { value: "won", label: "Won", tone: "success" },
        { value: "lost", label: "Lost", tone: "danger" },
      ],
    },
    { name: "value", label: "Value", kind: "money" },
    { name: "expectedCloseDate", label: "Expected close", kind: "date" },
    { name: "notes", label: "Notes", kind: "longText" },
    { name: "createdAt", label: "Added", kind: "date", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search opportunities…",
    columns: [
      { field: "title", primary: true, sortable: true },
      { field: "type", width: "w-28 shrink-0" },
      { field: "stage", width: "w-32 shrink-0" },
      { field: "value", sortable: true, width: "w-32 shrink-0" },
      { field: "expectedCloseDate", sortable: true, width: "w-36 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Opportunity", fields: ["title", "type", "stage"] },
      { title: "Commercials", fields: ["value", "expectedCloseDate"] },
      { title: "Notes", fields: ["notes"] },
      { title: "Record", fields: ["createdAt"] },
    ],
  },
  form: {
    sections: [
      { title: "Opportunity", fields: ["title", "type", "stage"] },
      { title: "Commercials", fields: ["value", "expectedCloseDate"] },
      { title: "Notes", fields: ["notes"] },
    ],
  },
};
