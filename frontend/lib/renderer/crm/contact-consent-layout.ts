import type { RecordLayout } from "../layout";

export const CONTACT_CONSENT_LAYOUT: RecordLayout = {
  key: "crm:contact-consent",
  singular: "Consent",
  plural: "Consent",
  titleField: "channel",
  fields: [
    {
      name: "channel",
      label: "Channel",
      kind: "badge",
      required: true,
      options: [
        { value: "EMAIL", label: "Email", tone: "neutral" },
        { value: "SMS", label: "SMS", tone: "neutral" },
        { value: "WHATSAPP", label: "WhatsApp", tone: "neutral" },
        { value: "PHONE", label: "Phone", tone: "neutral" },
        { value: "POST", label: "Post", tone: "neutral" },
      ],
    },
    {
      name: "status",
      label: "Status",
      kind: "badge",
      required: true,
      options: [
        { value: "OPTED_IN", label: "Opted in", tone: "success" },
        { value: "OPTED_OUT", label: "Opted out", tone: "danger" },
        { value: "UNKNOWN", label: "Unknown", tone: "warning" },
      ],
    },
    {
      name: "legalBasis",
      label: "Legal basis",
      kind: "badge",
      options: [
        { value: "CONSENT", label: "Consent", tone: "neutral" },
        { value: "CONTRACT", label: "Contract", tone: "neutral" },
        { value: "LEGITIMATE_INTEREST", label: "Legitimate interest", tone: "neutral" },
        { value: "LEGAL_OBLIGATION", label: "Legal obligation", tone: "neutral" },
      ],
    },
    {
      name: "source",
      label: "Recorded via",
      kind: "badge",
      readOnly: true,
      options: [
        { value: "USER_ENTRY", label: "Entered by a colleague", tone: "neutral" },
        { value: "IMPORT", label: "Import", tone: "neutral" },
        { value: "API", label: "API", tone: "neutral" },
        { value: "ENRICHMENT", label: "Enrichment", tone: "neutral" },
        { value: "UNSUBSCRIBE_LINK", label: "They unsubscribed", tone: "info" },
        { value: "WEB_FORM", label: "Web form", tone: "info" },
      ],
    },
    {
      name: "sourceDetail",
      label: "Note",
      kind: "text",
      hint: "Where this came from, in words an auditor could follow.",
    },
    { name: "capturedAt", label: "Captured", kind: "dateTime", readOnly: true },
    {
      name: "expiresAt",
      label: "Expires",
      kind: "date",
      hint: "Leave empty if this consent does not lapse.",
    },
  ],
  list: {
    searchPlaceholder: "Search consent…",
    columns: [
      { field: "channel", primary: true },
      { field: "status", width: "w-28 shrink-0" },
      { field: "capturedAt", width: "w-36 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Consent", fields: ["channel", "status", "legalBasis"] },
      { title: "Provenance", fields: ["source", "sourceDetail", "capturedAt", "expiresAt"] },
    ],
  },
  form: {
    sections: [
      { title: "Consent", fields: ["channel", "status", "legalBasis"] },
      { title: "Provenance", fields: ["sourceDetail", "expiresAt"] },
    ],
  },
};

export const CONSENT_CHANNELS = ["EMAIL", "SMS", "WHATSAPP", "PHONE", "POST"] as const;
export type ConsentChannel = (typeof CONSENT_CHANNELS)[number];

export const CONSENT_STATUSES = ["OPTED_IN", "OPTED_OUT", "UNKNOWN"] as const;
export type ConsentStatus = (typeof CONSENT_STATUSES)[number];

export const CONSENT_LEGAL_BASES = [
  "CONSENT",
  "CONTRACT",
  "LEGITIMATE_INTEREST",
  "LEGAL_OBLIGATION",
] as const;
export type ConsentLegalBasis = (typeof CONSENT_LEGAL_BASES)[number];
