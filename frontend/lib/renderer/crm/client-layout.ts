import type { RecordLayout } from "../layout";

/**
 * Clients, as data.
 *
 * A client account is written by the lead conversion, never by hand: `/clients`
 * exposes reads, a timeline, opportunities and an onboarding checklist, and no
 * create or update route for the account itself. So every field is read-only and
 * `form.sections` is empty, and the two say the same thing twice deliberately —
 * a tenant arrangement replaces the declared sections on the form as well as the
 * detail view, so an empty section list alone would stop being empty the moment
 * an administrator grouped the fields. Read-only fields are dropped from a form
 * whatever the sections say, which is what actually holds the record read-only.
 *
 * `salesRepName` and `assignedCrmName` are not columns on the account. The API
 * sends `salesRep` and `assignedCrm` as nested objects, and a description can
 * only name a top-level key — so the surfaces flatten the rows through
 * `clientRecord` before handing them over. Naming the person rather than
 * rendering `salesRepId` is the point: an id on screen is a bug.
 */
export const CLIENT_LAYOUT: RecordLayout = {
  key: "crm:client",
  singular: "Client",
  plural: "Clients",
  titleField: "clientName",
  fields: [
    { name: "clientName", label: "Client", kind: "text", readOnly: true },
    { name: "clientEmail", label: "Email", kind: "email", readOnly: true },
    { name: "clientPhone", label: "Phone", kind: "phone", readOnly: true },
    { name: "clientWhatsapp", label: "WhatsApp", kind: "phone", readOnly: true },
    {
      name: "status",
      label: "Status",
      kind: "badge",
      readOnly: true,
      options: [
        { value: "ACCOUNT_OPENING", label: "Account opening", tone: "info" },
        { value: "QUERIES", label: "Queries", tone: "warning" },
        { value: "PLAN_SELECTED", label: "Plan selected", tone: "neutral" },
        { value: "INVESTED", label: "Invested", tone: "success" },
      ],
    },
    { name: "salesRepName", label: "Sales rep", kind: "text", readOnly: true },
    { name: "assignedCrmName", label: "CRM rep", kind: "text", readOnly: true },
    { name: "planName", label: "Plan", kind: "text", readOnly: true },
    { name: "investmentAmount", label: "Invested", kind: "money", readOnly: true },
    { name: "estimatedInvestment", label: "Estimated", kind: "money", readOnly: true },
    { name: "investmentDate", label: "Investment date", kind: "date", readOnly: true },
    { name: "transactionRef", label: "Transaction ref", kind: "text", readOnly: true },
    { name: "convertedAt", label: "Converted", kind: "date", readOnly: true },
    { name: "investedAt", label: "Invested on", kind: "date", readOnly: true },
    {
      name: "renewalStage",
      label: "Renewal",
      kind: "badge",
      readOnly: true,
      options: [
        { value: "upcoming", label: "Upcoming", tone: "info" },
        { value: "in_discussion", label: "In discussion", tone: "warning" },
        { value: "renewed", label: "Renewed", tone: "success" },
        { value: "churned", label: "Churned", tone: "danger" },
      ],
    },
    { name: "renewalDate", label: "Renewal date", kind: "date", readOnly: true },
    { name: "conversionNotes", label: "Conversion notes", kind: "longText", readOnly: true },
    { name: "renewalNotes", label: "Renewal notes", kind: "longText", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search clients…",
    columns: [
      { field: "clientName", primary: true, subtitle: "clientEmail" },
      { field: "clientPhone", width: "w-40 shrink-0" },
      { field: "status", width: "w-36 shrink-0" },
      { field: "salesRepName", width: "w-40 shrink-0" },
      { field: "investmentAmount", width: "w-32 shrink-0" },
      { field: "investedAt", width: "w-32 shrink-0" },
    ],
  },
  detail: {
    sections: [
      {
        title: "Contact",
        fields: ["clientEmail", "clientPhone", "clientWhatsapp", "salesRepName", "assignedCrmName"],
      },
      {
        title: "Investment",
        fields: [
          "investmentAmount",
          "estimatedInvestment",
          "planName",
          "investmentDate",
          "transactionRef",
        ],
      },
      { title: "Lifecycle", fields: ["status", "convertedAt", "investedAt", "renewalStage", "renewalDate"] },
      { title: "Notes", fields: ["conversionNotes", "renewalNotes"] },
    ],
  },
  form: { sections: [] },
};
