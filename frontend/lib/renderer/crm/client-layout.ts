import type { RecordLayout } from "../layout";

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
