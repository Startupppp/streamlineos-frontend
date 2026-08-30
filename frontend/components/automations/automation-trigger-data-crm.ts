import type { TriggerMeta } from "./automation-trigger-types";

export const CRM_TRIGGER_META: TriggerMeta[] = [
  {
    value: "lead.created",
    label: "Lead created",
    description: "Runs when a new lead is added to the CRM",
    module: "crm",
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
    module: "crm",
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
];
