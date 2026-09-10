import type { RecordLayout } from "../layout";

/**
 * What this person has agreed to be contacted about, per channel.
 *
 * Consent is a record between a contact and a channel rather than a flag on the
 * contact: somebody may take email and refuse SMS, and the two carry different
 * legal bases and different expiry. The history matters as much as the current
 * answer — under DPDP and GDPR the question at audit is not "are they opted in"
 * but "what were you told, when, and on what basis", so rows accumulate rather
 * than overwrite and the card shows them newest first.
 *
 * **`source` is declared with all six values and is `readOnly`, and that is a
 * decision rather than an oversight.** The API accepts only four of them from an
 * authenticated operator — `USER_ENTRY`, `IMPORT`, `API`, `ENRICHMENT` — and
 * reserves `UNSUBSCRIBE_LINK` and `WEB_FORM` for the system, because provenance
 * is the one field an audit actually leans on and an operator able to claim "they
 * unsubscribed themselves" could rewrite the story of a complaint. Declaring only
 * the four would leave system rows rendering as an unknown value; declaring all
 * six in an editable field would hand the UI the forging control the API refuses.
 * So all six are declared for DISPLAY, the field never enters the form, and the
 * surface posts `USER_ENTRY` — the only thing an operator recording consent on
 * this screen can truthfully be.
 *
 * `status` is the only field tinted as good or bad news. A channel is not good
 * or bad, and neither is a legal basis: `LEGITIMATE_INTEREST` is a lawful
 * ground, not a lesser one, and tinting it amber would editorialise a legal
 * question the product has no business answering.
 */
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
        /*
          Amber, not grey. "Unknown" is not a neutral resting state for a
          contactable channel — it means nobody has established a basis for
          reaching this person there, which is the state a compliance review
          asks about.
        */
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
        /* System-only; an operator cannot claim either of these. */
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
    /* `source` is absent on purpose — see the note above. */
    sections: [
      { title: "Consent", fields: ["channel", "status", "legalBasis"] },
      { title: "Provenance", fields: ["sourceDetail", "expiresAt"] },
    ],
  },
};

/** The channels a compliance count can be taken for, in the order the card shows them. */
export const CONSENT_CHANNELS = ["EMAIL", "SMS", "WHATSAPP", "PHONE", "POST"] as const;
export type ConsentChannel = (typeof CONSENT_CHANNELS)[number];
