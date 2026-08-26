import type { RecordLayout } from "../layout";

/**
 * A logged interaction with a lead, as data.
 *
 * Separate from `crm:activity` on purpose: this records what happened in a
 * conversation — how long it ran, where it happened, how it went — while a CRM
 * activity is a scheduled piece of work with a due date. Folding them into one
 * description would produce a form asking a salesperson for a due date on a call
 * that already finished.
 */
export const LEAD_ACTIVITY_LAYOUT: RecordLayout = {
  key: "crm:lead-activity",
  singular: "Interaction",
  plural: "Interactions",
  titleField: "subject",
  fields: [
    {
      name: "activityType",
      label: "Activity type",
      kind: "select",
      required: true,
      options: [
        { value: "call", label: "Phone call" },
        { value: "email", label: "Email" },
        { value: "whatsapp", label: "WhatsApp" },
        { value: "meeting", label: "Meeting" },
        { value: "site_visit", label: "Site visit" },
      ],
    },
    { name: "subject", label: "Subject", kind: "text", hint: "A brief description." },
    { name: "duration", label: "Duration (min)", kind: "number" },
    { name: "outcome", label: "Outcome", kind: "text" },
    { name: "location", label: "Location", kind: "text", hint: "For a meeting or a site visit." },
    { name: "activityNotes", label: "Notes", kind: "longText" },
  ],
  list: {
    searchPlaceholder: "Search interactions…",
    columns: [
      { field: "subject", primary: true },
      { field: "activityType", width: "w-32 shrink-0" },
      { field: "outcome", width: "w-32 shrink-0" },
      { field: "duration", width: "w-24 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Interaction", fields: ["activityType", "subject", "outcome"] },
      { title: "Where and how long", fields: ["location", "duration"] },
      { title: "Notes", fields: ["activityNotes"] },
    ],
  },
  form: {
    sections: [
      { title: "Interaction", fields: ["activityType", "subject"] },
      { title: "Where and how long", fields: ["duration", "outcome", "location"] },
      { title: "Notes", fields: ["activityNotes"] },
    ],
  },
};
