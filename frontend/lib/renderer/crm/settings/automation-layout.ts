import type { RecordLayout } from "../../layout";

/**
 * An automation rule, as data — for the list only.
 *
 * Every field is read-only and the form has no sections, and both are honest
 * rather than lazy: an automation is not created or edited on a form at all. It
 * is built on a canvas at `/crm/settings/automations/[id]`, where a rule is a
 * graph of nodes and branches. A graph is not a field, the vocabulary has no way
 * to say it, and a description that offered a text box for one would be a worse
 * lie than having no form.
 *
 * What the list shows *is* describable, and describing it removed the two things
 * the hand-written table was doing by itself: a date formatted with an inline
 * `toLocaleDateString` (so it sorted alphabetically), and a trigger rendered as a
 * rounded pill in `bg-primary/10` — the accent colour used decoratively, which
 * §7 bans.
 *
 * `trigger` is a `triggerLabel` here rather than the stored event key. The keys
 * come from `/crm/automations/events` and are per-tenant, so a description
 * cannot enumerate them as select options; the surface resolves the label from
 * the events it has already loaded, which is what the old table did too.
 */
export const AUTOMATION_LAYOUT: RecordLayout = {
  key: "crm:settings:automation",
  singular: "Automation",
  plural: "Automations",
  titleField: "name",
  fields: [
    { name: "name", label: "Automation", kind: "text", readOnly: true },
    { name: "triggerLabel", label: "Runs when", kind: "text", readOnly: true },
    {
      name: "state",
      label: "State",
      kind: "badge",
      readOnly: true,
      options: [
        { value: "live", label: "Live", tone: "success" },
        { value: "draft", label: "Draft", tone: "warning" },
        { value: "paused", label: "Paused", tone: "neutral" },
      ],
    },
    { name: "version", label: "Version", kind: "number", readOnly: true },
    { name: "executionCount", label: "Runs", kind: "number", readOnly: true },
    { name: "lastRunAt", label: "Last run", kind: "dateTime", readOnly: true },
    { name: "cooldownMinutes", label: "Cooldown (min)", kind: "number", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search automations…",
    columns: [
      { field: "name", primary: true },
      { field: "triggerLabel", width: "w-56 shrink-0" },
      { field: "state", width: "w-24 shrink-0" },
      { field: "executionCount", width: "w-20 shrink-0" },
      { field: "lastRunAt", width: "w-44 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Automation", fields: ["name", "triggerLabel", "state", "version"] },
      { title: "History", fields: ["executionCount", "lastRunAt", "cooldownMinutes"] },
    ],
  },
  form: { sections: [] },
};
