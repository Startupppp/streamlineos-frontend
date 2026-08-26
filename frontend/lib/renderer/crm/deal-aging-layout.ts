import type { RecordLayout, SelectOption } from "../layout";

/**
 * The aging report, as data.
 *
 * An aging row is not a deal. It carries `daysInStage`, which no deal record
 * has, and it drops most of what a deal is; describing it with `DEAL_LAYOUT`
 * would mean putting a report-only field on the deal everywhere the deal is
 * rendered. So it is its own description, and the two share only the pipeline
 * vocabulary — `withDealStages` fills `stage` here exactly as it does there.
 *
 * `daysInStage` deliberately carries no `sign`. A sign says which direction is
 * good news and tones every non-zero value accordingly; days in a stage is
 * never negative, so `cost` would paint every row in the table red and tell the
 * reader nothing. What the screen actually judges is a threshold — a fortnight
 * is a wobble, a month is a problem — and a threshold is not a sign.
 *
 * That verdict is `severity`, a field the API does not send and
 * `dealAgingRecordFields` derives. It is a real badge with a word in it rather
 * than a tinted number, so the judgement survives being read in greyscale, and
 * the thresholds live beside the field they define instead of in a
 * `getDayClassName` helper on one screen.
 */

export type AgingSeverity = "healthy" | "warning" | "critical";

/** A fortnight is a wobble; a month is a problem. */
export const AGING_WARNING_DAYS = 15;
export const AGING_CRITICAL_DAYS = 30;

export function agingSeverity(daysInStage: number): AgingSeverity {
  if (daysInStage > AGING_CRITICAL_DAYS) return "critical";
  if (daysInStage >= AGING_WARNING_DAYS) return "warning";
  return "healthy";
}

const SEVERITY_OPTIONS: readonly SelectOption[] = [
  { value: "healthy", label: "Healthy", tone: "success" },
  { value: "warning", label: "Warning", tone: "warning" },
  { value: "critical", label: "Critical", tone: "danger" },
];

export const DEAL_AGING_LAYOUT: RecordLayout = {
  key: "crm:deal-aging",
  singular: "Stalled deal",
  plural: "Stalled deals",
  titleField: "name",
  fields: [
    { name: "name", label: "Deal", kind: "text", readOnly: true },
    {
      name: "stage",
      label: "Stage",
      kind: "badge",
      readOnly: true,
      // Filled from the tenant's own pipeline by `withDealStages`.
    },
    { name: "assigneeName", label: "Assignee", kind: "text", readOnly: true },
    { name: "daysInStage", label: "Days in stage", kind: "number", readOnly: true },
    {
      name: "severity",
      label: "Severity",
      kind: "badge",
      readOnly: true,
      options: SEVERITY_OPTIONS,
    },
    { name: "value", label: "Deal value", kind: "money", readOnly: true },
    { name: "createdAt", label: "Created", kind: "date", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search stalled deals…",
    columns: [
      { field: "name", primary: true, sortable: true },
      { field: "stage", width: "w-32 shrink-0" },
      { field: "assigneeName", width: "min-w-[140px]" },
      { field: "daysInStage", sortable: true, width: "w-28 shrink-0" },
      { field: "severity", width: "w-24 shrink-0" },
      { field: "value", sortable: true, width: "w-32 shrink-0" },
      { field: "createdAt", sortable: true, width: "w-28 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Stalled", fields: ["stage", "daysInStage", "severity"] },
      { title: "Deal", fields: ["value", "assigneeName", "createdAt"] },
    ],
  },
  /*
    Nothing about an aging row is editable: it is a projection the server
    computes, and the way to change it is to move the deal. An empty form
    section list says that, where a form full of read-only controls would not.
  */
  form: { sections: [] },
};

/** The shape the aging endpoint sends, as much of it as the description names. */
export interface AgingDealRecord {
  readonly id: number;
  readonly name: string;
  readonly value: string | null;
  readonly stage: string;
  readonly daysInStage: number;
  readonly createdAt: string;
  readonly assigneeName: string | null;
}

/** One aging row in the shape the description names, `severity` included. */
export function dealAgingRecordFields(deal: AgingDealRecord): Record<string, unknown> {
  return {
    id: deal.id,
    name: deal.name,
    stage: deal.stage,
    assigneeName: deal.assigneeName,
    daysInStage: deal.daysInStage,
    severity: agingSeverity(deal.daysInStage),
    value: deal.value,
    createdAt: deal.createdAt,
  };
}
