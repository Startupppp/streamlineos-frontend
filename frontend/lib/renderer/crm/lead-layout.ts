import type { LeadPriority, LeadSource, PipelineStatus } from "@/types/leads";
import type { RecordLayout, SelectOption } from "../layout";

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
