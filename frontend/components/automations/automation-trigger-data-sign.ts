import type { TriggerMeta } from "./automation-trigger-types";

const ENVELOPE_FIELDS = [
  { value: "envelopeTitle", label: "Envelope title" },
  { value: "status", label: "Envelope status" },
  { value: "sourceModule", label: "Source module" },
  { value: "sourceEntityType", label: "Source entity type" },
];

const ENVELOPE_PAYLOAD = {
  envelopeId: 1,
  envelopeTitle: "Employment agreement",
  status: "SENT",
  sourceModule: "hr",
  sourceEntityType: "offer",
  sourceEntityId: "1",
  senderMembershipId: 1,
};

export const SIGN_TRIGGER_META: TriggerMeta[] = [
  {
    value: "sign.envelope.sent",
    label: "Envelope sent",
    description: "Runs when a signature envelope is sent to its recipients",
    module: "sign",
    fields: ENVELOPE_FIELDS,
    samplePayload: ENVELOPE_PAYLOAD,
  },
  {
    value: "sign.envelope.completed",
    label: "Envelope completed",
    description: "Runs when every recipient has signed an envelope",
    module: "sign",
    fields: ENVELOPE_FIELDS,
    samplePayload: { ...ENVELOPE_PAYLOAD, status: "COMPLETED" },
  },
  {
    value: "sign.envelope.declined",
    label: "Envelope declined",
    description: "Runs when a recipient declines to sign an envelope",
    module: "sign",
    fields: ENVELOPE_FIELDS,
    samplePayload: { ...ENVELOPE_PAYLOAD, status: "DECLINED" },
  },
  {
    value: "sign.envelope.voided",
    label: "Envelope voided",
    description: "Runs when an envelope is voided before completion",
    module: "sign",
    fields: ENVELOPE_FIELDS,
    samplePayload: { ...ENVELOPE_PAYLOAD, status: "VOIDED" },
  },
  {
    value: "sign.envelope.expired",
    label: "Envelope expired",
    description: "Runs when an envelope passes its expiry date unsigned",
    module: "sign",
    fields: ENVELOPE_FIELDS,
    samplePayload: { ...ENVELOPE_PAYLOAD, status: "EXPIRED" },
  },
  {
    value: "sign.recipient.completed",
    label: "Recipient signed",
    description: "Runs when one recipient finishes signing an envelope",
    module: "sign",
    fields: [
      ...ENVELOPE_FIELDS,
      { value: "recipientName", label: "Recipient name" },
      { value: "recipientEmail", label: "Recipient email" },
    ],
    samplePayload: {
      ...ENVELOPE_PAYLOAD,
      recipientId: 1,
      recipientName: "Jane Smith",
      recipientEmail: "jane@example.com",
    },
  },
  {
    value: "sign.bulk_send.completed",
    label: "Bulk send completed",
    description: "Runs when a bulk send job finishes dispatching its envelopes",
    module: "sign",
    fields: [
      { value: "totalCount", label: "Total envelopes" },
      { value: "successCount", label: "Sent" },
      { value: "failedCount", label: "Failed" },
    ],
    samplePayload: {
      jobId: 1,
      senderUserId: "",
      totalCount: 50,
      successCount: 48,
      failedCount: 2,
    },
  },
];
