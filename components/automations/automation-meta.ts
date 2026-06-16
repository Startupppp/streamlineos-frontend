import type { AutomationTrigger, AutomationActionType, AutomationConditionOp } from "@/lib/api/hooks/automations";

export interface TriggerMeta {
  value: AutomationTrigger;
  label: string;
  description: string;
  fields: { value: string; label: string }[];
  samplePayload: Record<string, unknown>;
}

export const TRIGGER_META: TriggerMeta[] = [
  {
    value: "lead.created",
    label: "Lead created",
    description: "Runs when a new lead is added to the CRM",
    fields: [
      { value: "name", label: "Lead name" },
      { value: "email", label: "Email" },
      { value: "source", label: "Source (referral, website, etc.)" },
      { value: "assignedToId", label: "Assigned rep ID" },
    ],
    samplePayload: {
      id: 1,
      name: "Acme Corp",
      email: "buyer@acme.com",
      source: "website",
      assignedToId: "",
    },
  },
  {
    value: "deal.stage_changed",
    label: "Deal stage changed",
    description: "Runs when a deal moves to a different stage",
    fields: [
      { value: "name", label: "Deal name" },
      { value: "value", label: "Deal value" },
      { value: "stage", label: "New stage (WON, NEGOTIATION, etc.)" },
      { value: "previousStage", label: "Previous stage" },
      { value: "assignedToId", label: "Assigned rep ID" },
    ],
    samplePayload: {
      id: 1,
      name: "Enterprise renewal",
      value: "50000",
      stage: "WON",
      previousStage: "NEGOTIATION",
      assignedToId: "",
    },
  },
  {
    value: "ticket.created",
    label: "Support ticket created",
    description: "Runs when a new support ticket is opened",
    fields: [
      { value: "subject", label: "Subject" },
      { value: "priority", label: "Priority (LOW, HIGH, URGENT)" },
      { value: "status", label: "Status" },
      { value: "requesterEmail", label: "Requester email" },
    ],
    samplePayload: {
      id: 1,
      subject: "Cannot log in",
      priority: "URGENT",
      status: "OPEN",
      requesterEmail: "user@customer.com",
    },
  },
  {
    value: "invoice.overdue",
    label: "Invoice overdue",
    description: "Runs when an invoice passes its due date unpaid",
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

export const CONDITION_OPS: { value: AutomationConditionOp; label: string }[] = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "contains", label: "contains" },
  { value: "gt", label: "greater than" },
  { value: "lt", label: "less than" },
  { value: "exists", label: "exists" },
];

export const ACTION_TYPES: { value: AutomationActionType; label: string; description: string }[] = [
  { value: "notify_roles", label: "Notify roles", description: "In-app notification to members with given roles" },
  { value: "notify_all", label: "Notify everyone", description: "In-app notification to all org members" },
  { value: "email", label: "Send email", description: "Send an email to a fixed address" },
  { value: "create_task", label: "Create task", description: "Create a follow-up task" },
  { value: "webhook", label: "Fire webhook", description: "Dispatch an outbound webhook event" },
];

export function getTriggerMeta(trigger: AutomationTrigger): TriggerMeta {
  return TRIGGER_META.find((t) => t.value === trigger) ?? TRIGGER_META[0];
}
