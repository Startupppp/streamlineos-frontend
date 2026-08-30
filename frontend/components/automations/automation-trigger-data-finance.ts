import type { TriggerMeta } from "./automation-trigger-types";

export const FINANCE_TRIGGER_META: TriggerMeta[] = [
  {
    value: "invoice.overdue",
    label: "Invoice overdue",
    description: "Runs when an invoice passes its due date unpaid",
    module: "finance",
    fields: [
      { value: "number", label: "Invoice number" },
      { value: "amount", label: "Amount due" },
      { value: "daysOverdue", label: "Days overdue" },
      { value: "clientEmail", label: "Client email" },
    ],
    samplePayload: {
      id: 1,
      number: "INV-1024",
      amount: "12000",
      daysOverdue: 7,
      clientEmail: "ap@client.com",
    },
  },
];
