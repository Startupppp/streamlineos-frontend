import type { RecordLayout } from "../layout";

/**
 * A call, as data.
 *
 * The record it becomes is a task of type `CALL` — the platform has no call
 * table — so the layout describes what a person is asked, and the surface is
 * what knows the shape the API stores it in. That split is the point: the
 * question "what did this call involve" is stable, and where it is filed is not.
 */
export const CALL_LOG_LAYOUT: RecordLayout = {
  key: "crm:call-log",
  singular: "Call",
  plural: "Calls",
  titleField: "outcome",
  fields: [
    {
      name: "direction",
      label: "Direction",
      kind: "select",
      required: true,
      options: [
        { value: "OUTBOUND", label: "Outbound" },
        { value: "INBOUND", label: "Inbound" },
      ],
    },
    {
      name: "outcome",
      label: "Outcome",
      kind: "select",
      required: true,
      options: [
        { value: "CONNECTED", label: "Connected", tone: "success" },
        { value: "NO_ANSWER", label: "No answer", tone: "warning" },
        { value: "VOICEMAIL", label: "Voicemail", tone: "info" },
        { value: "BUSY", label: "Busy", tone: "warning" },
        { value: "WRONG_NUMBER", label: "Wrong number", tone: "danger" },
      ],
    },
    { name: "durationMinutes", label: "Duration (min)", kind: "number" },
    { name: "calledAt", label: "Called at", kind: "dateTime" },
    { name: "notes", label: "Notes", kind: "longText", hint: "What was discussed?" },
  ],
  list: {
    searchPlaceholder: "Search calls…",
    columns: [
      { field: "outcome", primary: true },
      { field: "direction", width: "w-28 shrink-0" },
      { field: "durationMinutes", width: "w-28 shrink-0" },
      { field: "calledAt", width: "w-44 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Call", fields: ["direction", "outcome"] },
      { title: "When and how long", fields: ["calledAt", "durationMinutes"] },
      { title: "Notes", fields: ["notes"] },
    ],
  },
  form: {
    sections: [
      { title: "Call", fields: ["direction", "outcome"] },
      { title: "When and how long", fields: ["durationMinutes", "calledAt"] },
      { title: "Notes", fields: ["notes"] },
    ],
  },
};

export const CALL_DIRECTION_LABELS: Record<string, string> = {
  INBOUND: "Inbound",
  OUTBOUND: "Outbound",
};

export const CALL_OUTCOME_LABELS: Record<string, string> = {
  CONNECTED: "Connected",
  NO_ANSWER: "No answer",
  VOICEMAIL: "Voicemail",
  BUSY: "Busy",
  WRONG_NUMBER: "Wrong number",
};
