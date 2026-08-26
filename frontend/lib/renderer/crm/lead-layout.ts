import type { CrmOption } from "@/types/crm/metadata";
import type { LeadPriority, LeadSource, PipelineStatus } from "@/types/leads";
import type { FieldTone, RecordLayout, SelectOption } from "../layout";

/**
 * Leads, as data.
 *
 * The surface this replaces carried its own column catalogue, its own
 * localStorage column-visibility set and its own Zod schema, all describing the
 * same record three times over — and all three had drifted. The edit form never
 * gained `source`, `whatsappNumber` or `designation`, which the update endpoint
 * has always accepted, so nine months of lead edits could not touch them.
 *
 * Two columns the hand-written table carried are gone rather than translated.
 * "Follow-up" read a `followUpDate` the leads endpoint has never sent, so it
 * rendered an em dash on every row for every lead; "Lead ID" was the row's
 * primary key wearing a prefix. A generated table has to name a field that
 * exists, which is what surfaced both.
 *
 * `score` carries no `sign`. It is a magnitude the scoring rules produce, not a
 * verdict about good or bad news, and tinting every row's number green would
 * tell the reader nothing they could act on.
 */

const STATUS_OPTIONS: readonly (SelectOption & { value: PipelineStatus })[] = [
  { value: "NEW", label: "New", tone: "info" },
  { value: "CONTACTED", label: "Contacted", tone: "info" },
  { value: "INTERESTED", label: "Interested", tone: "warning" },
  { value: "QUALIFIED", label: "Qualified", tone: "warning" },
  { value: "CONVERTED", label: "Converted", tone: "success" },
  { value: "LOST", label: "Lost", tone: "danger" },
];

const PRIORITY_OPTIONS: readonly (SelectOption & { value: LeadPriority })[] = [
  { value: "HOT", label: "Hot", tone: "danger" },
  { value: "WARM", label: "Warm", tone: "warning" },
  { value: "COLD", label: "Cold", tone: "info" },
];

const SOURCE_OPTIONS: readonly (SelectOption & { value: LeadSource })[] = [
  { value: "referral", label: "Referral" },
  { value: "campaign", label: "Campaign" },
  { value: "cold_call", label: "Cold call" },
  { value: "website", label: "Website" },
  { value: "social_media", label: "Social media" },
  { value: "walk_in", label: "Walk-in" },
  { value: "other", label: "Other" },
];

export const LEAD_STATUS_OPTIONS = STATUS_OPTIONS;
export const LEAD_PRIORITY_OPTIONS = PRIORITY_OPTIONS;

export const LEAD_LAYOUT: RecordLayout = {
  key: "crm:lead",
  singular: "Lead",
  plural: "Leads",
  titleField: "name",
  fields: [
    { name: "name", label: "Lead", kind: "text", required: true },
    {
      name: "status",
      label: "Status",
      kind: "badge",
      // Neither create nor update accepts a status: it moves through
      // `PATCH /leads/:id/status`, which also mints the client record on
      // conversion. A control here would be one whose value is dropped.
      readOnly: true,
      options: STATUS_OPTIONS,
    },
    { name: "priority", label: "Priority", kind: "select", required: true, options: PRIORITY_OPTIONS },
    { name: "source", label: "Source", kind: "select", required: true, options: SOURCE_OPTIONS },
    {
      name: "referredBy",
      label: "Referred by",
      kind: "text",
      hint: "Who sent this lead your way.",
    },
    { name: "email", label: "Email", kind: "email" },
    { name: "phone", label: "Phone", kind: "phone" },
    { name: "whatsappNumber", label: "WhatsApp", kind: "phone" },
    { name: "company", label: "Company", kind: "text" },
    { name: "designation", label: "Designation", kind: "text" },
    { name: "city", label: "City", kind: "text" },
    { name: "website", label: "Website", kind: "url", readOnly: true },
    { name: "potentialValue", label: "Potential value", kind: "money" },
    { name: "investmentInterest", label: "Investment interest", kind: "money" },
    { name: "score", label: "Score", kind: "number", readOnly: true },
    { name: "tags", label: "Tags", kind: "text", readOnly: true },
    { name: "campaignName", label: "Campaign", kind: "text", readOnly: true },
    { name: "assignedToName", label: "Owner", kind: "text", readOnly: true },
    { name: "assignedAt", label: "Assigned", kind: "date", readOnly: true },
    { name: "convertedAt", label: "Converted", kind: "date", readOnly: true },
    { name: "slaDeadline", label: "SLA due", kind: "dateTime", readOnly: true },
    { name: "createdAt", label: "Added", kind: "date", readOnly: true },
    {
      name: "lostReason",
      label: "Lost reason",
      kind: "text",
      // Create has no reason to lose a lead it is still making, and the create
      // DTO does not accept one.
      editOnly: true,
    },
    { name: "notes", label: "Notes", kind: "longText" },
  ],
  list: {
    searchPlaceholder: "Search leads…",
    columns: [
      { field: "name", primary: true, sortable: true, subtitle: "company" },
      { field: "status", width: "w-28 shrink-0" },
      { field: "priority", width: "w-24 shrink-0" },
      { field: "source", width: "w-28 shrink-0" },
      { field: "phone", width: "w-36 shrink-0" },
      /*
        Email is a column rather than only a field, because three lead surfaces
        are about working out *which person this is* — distribution, the
        duplicate scan and natural-language search all showed it — and an
        adjustment can only hide or reorder the columns a description declares,
        never add one. Without it here those screens would each have had to fork
        the description to get an address back, which is the fork this file
        exists to prevent. A tenant who does not scan by email hides it once and
        it leaves every lead surface at the same time.
      */
      { field: "email", width: "w-52 shrink-0" },
      { field: "city", width: "w-28 shrink-0" },
      { field: "potentialValue", sortable: true, width: "w-32 shrink-0" },
      { field: "investmentInterest", width: "w-32 shrink-0" },
      { field: "score", sortable: true, width: "w-20 shrink-0" },
      { field: "assignedToName", width: "w-32 shrink-0" },
      { field: "createdAt", sortable: true, width: "w-28 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Contact", fields: ["name", "email", "phone", "whatsappNumber"] },
      { title: "Organisation", fields: ["company", "designation", "city", "website"] },
      {
        title: "Pipeline",
        fields: ["status", "priority", "source", "referredBy", "campaignName", "score", "tags"],
      },
      { title: "Value", fields: ["potentialValue", "investmentInterest"] },
      {
        title: "Ownership",
        fields: ["assignedToName", "assignedAt", "convertedAt", "slaDeadline", "createdAt"],
      },
      { title: "Notes", fields: ["notes", "lostReason"] },
    ],
  },
  form: {
    sections: [
      { title: "Contact", fields: ["name", "email", "phone", "whatsappNumber"] },
      { title: "Organisation", fields: ["company", "designation", "city"] },
      { title: "Classification", fields: ["source", "referredBy", "priority"] },
      { title: "Value", fields: ["potentialValue", "investmentInterest"] },
      { title: "Notes", fields: ["notes", "lostReason"] },
    ],
  },
};

/**
 * The tenant's own word for a status, a priority or a source.
 *
 * The three option sets above are what the API ships with, but an administrator
 * can rename them and add their own — a pipeline whose "Interested" is called
 * "Site visit booked". Rendering the compiled label to that tenant is not a
 * cosmetic mismatch: it is a screen naming a state their team does not use, and
 * the surfaces this replaced got it right by reaching for `useCrmMetadata` on
 * every badge. This is the same fact supplied once, to the description, so the
 * list, the form and the detail view cannot disagree about what a status is
 * called.
 *
 * Returns the field untouched when nothing has loaded. An empty option list
 * still renders the stored key, which is the honest thing to show while the
 * metadata is in flight; replacing it with an invented list would offer values
 * this tenant does not have.
 */
const OPTION_TONES: Record<string, FieldTone> = {
  emerald: "success",
  amber: "warning",
  orange: "warning",
  red: "danger",
  slate: "neutral",
};

/**
 * A tenant colour as a status tone.
 *
 * Lossy on purpose, and worth stating: the metadata colours are a ten-hue
 * categorical scale an administrator picks from, and `FieldTone` is a five-value
 * status scale that means good, caution, bad, informational, inert. Emerald,
 * amber, orange and red carry a verdict and map onto one; the remaining hues —
 * blue, sky, cyan, violet, pink — are choices of hue rather than of meaning, so
 * they all read as informational and two of them on one list will look alike.
 *
 * The alternative was to give them no tone, which renders them as plain text
 * beside their toned neighbours — a badge that lost its badge. Informational is
 * the weaker failure.
 */
function toneForOptionColor(color: string): FieldTone {
  return OPTION_TONES[color] ?? "info";
}

function optionsFor(options: readonly CrmOption[]): SelectOption[] {
  return options.map((option) => ({
    value: option.key,
    label: option.label,
    tone: toneForOptionColor(option.color),
  }));
}

export interface LeadMetadataOptions {
  readonly status?: readonly CrmOption[];
  readonly priority?: readonly CrmOption[];
  readonly source?: readonly CrmOption[];
}

/** The description with this organisation's own status, priority and source vocabulary. */
export function withLeadOptions(
  layout: RecordLayout,
  metadata: LeadMetadataOptions,
): RecordLayout {
  const byField: Record<string, readonly CrmOption[] | undefined> = {
    status: metadata.status,
    priority: metadata.priority,
    source: metadata.source,
  };

  return {
    ...layout,
    fields: layout.fields.map((field) => {
      const options = byField[field.name];
      if (!options || options.length === 0) return field;
      return { ...field, options: optionsFor(options) };
    }),
  };
}
