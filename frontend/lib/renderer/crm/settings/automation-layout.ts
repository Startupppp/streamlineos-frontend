import type { RecordLayout } from "../../layout";

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
