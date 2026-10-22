import type { CrmOption } from "@/types/crm/metadata";
import type { LeadPriority, LeadSource, PipelineStatus } from "@/types/leads";
import type { FieldTone, RecordLayout, SelectOption } from "../layout";


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
      editOnly: true,
    },
    { name: "notes", label: "Notes", kind: "longText" },
  ],
  list: {
    searchPlaceholder: "Search leads…",
    columns: [
      { field: "name", primary: true, subtitle: "company" },
      { field: "status", width: "w-28 shrink-0" },
      { field: "priority", width: "w-24 shrink-0" },
      { field: "source", width: "w-28 shrink-0" },
      { field: "phone", width: "w-36 shrink-0" },
      { field: "email", width: "w-52 shrink-0" },
      { field: "city", width: "w-28 shrink-0" },
      { field: "potentialValue", width: "w-32 shrink-0" },
      { field: "investmentInterest", width: "w-32 shrink-0" },
      { field: "score", width: "w-20 shrink-0" },
      { field: "assignedToName", width: "w-32 shrink-0" },
      { field: "createdAt", width: "w-28 shrink-0" },
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

const OPTION_TONES: Record<string, FieldTone> = {
  emerald: "success",
  amber: "warning",
  orange: "warning",
  red: "danger",
  slate: "neutral",
};

function toneForOptionColor(color: string | null): FieldTone {
  if (color === null) return "info";
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
