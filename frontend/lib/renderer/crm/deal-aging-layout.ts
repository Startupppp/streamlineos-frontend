import type { RecordLayout, SelectOption } from "../layout";


export type AgingSeverity = "healthy" | "warning" | "critical";

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
      { field: "name", primary: true },
      { field: "stage", width: "w-32 shrink-0" },
      { field: "assigneeName", width: "min-w-[140px]" },
      { field: "daysInStage", width: "w-28 shrink-0" },
      { field: "severity", width: "w-24 shrink-0" },
      { field: "value", width: "w-32 shrink-0" },
      { field: "createdAt", width: "w-28 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Stalled", fields: ["stage", "daysInStage", "severity"] },
      { title: "Deal", fields: ["value", "assigneeName", "createdAt"] },
    ],
  },
  form: { sections: [] },
};

export interface AgingDealRecord {
  readonly id: number;
  readonly name: string;
  readonly value: string | null;
  readonly stage: string;
  readonly daysInStage: number;
  readonly createdAt: string;
  readonly assigneeName: string | null;
}

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
