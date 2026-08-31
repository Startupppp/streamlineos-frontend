import type { TriggerMeta } from "./automation-trigger-types";

export const SUPPORT_TRIGGER_META: TriggerMeta[] = [
  {
    value: "ticket.created",
    label: "Support ticket created",
    description: "Runs when a new support ticket is opened",
    module: "support",
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
    value: "ticket.priority_changed",
    label: "Ticket priority changed",
    description: "Runs when a support ticket's priority is updated",
    module: "support",
    fields: [
      { value: "priority", label: "New priority" },
      { value: "previousPriority", label: "Previous priority" },
      { value: "status", label: "Status" },
    ],
    samplePayload: {
      id: 1,
      priority: "URGENT",
      previousPriority: "MEDIUM",
      status: "OPEN",
    },
  },
  {
    value: "ticket.message_received",
    label: "Ticket message received",
    description: "Runs when a new message is posted on a support ticket",
    module: "support",
    fields: [
      { value: "isInternal", label: "Is internal note" },
      { value: "sourceChannel", label: "Source channel" },
      { value: "priority", label: "Ticket priority" },
    ],
    samplePayload: {
      ticketId: 1,
      isInternal: false,
      sourceChannel: "email",
      priority: "HIGH",
    },
  },
];
