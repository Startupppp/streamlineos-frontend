import { formatDealId } from "@/lib/format-utils";
import type { Deal } from "@/types/crm";
import type { FieldTone, RecordLayout, SelectOption } from "../layout";

export const DEAL_LAYOUT: RecordLayout = {
  key: "crm:deal",
  singular: "Deal",
  plural: "Deals",
  titleField: "name",
  fields: [
    { name: "name", label: "Deal", kind: "text", required: true },
    { name: "reference", label: "Deal ID", kind: "text", readOnly: true },
    { name: "stage", label: "Stage", kind: "select", required: true },
    { name: "value", label: "Value", kind: "money" },
    {
      name: "probability",
      label: "Probability",
      kind: "percent",
      hint: "How likely this deal is to close, from 0 to 100.",
    },
    { name: "expectedCloseDate", label: "Expected close", kind: "date" },
    {
      name: "actualCloseDate",
      label: "Actual close",
      kind: "date",
      editOnly: true,
    },
    { name: "contactPerson", label: "Contact", kind: "text" },
    { name: "contactEmail", label: "Contact email", kind: "email" },
    { name: "contactPhone", label: "Contact phone", kind: "phone" },
    {
      name: "lostReason",
      label: "Lost reason",
      kind: "text",
      editOnly: true,
    },
    { name: "notes", label: "Notes", kind: "longText" },
    { name: "assignedToName", label: "Owner", kind: "text", readOnly: true },
    { name: "createdAt", label: "Created", kind: "date", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search deals…",
    columns: [
      { field: "reference", width: "w-28 shrink-0" },
      { field: "name", primary: true, subtitle: "contactPerson" },
      { field: "value", width: "w-32 shrink-0" },
      { field: "stage", width: "w-32 shrink-0" },
      { field: "probability", width: "w-24 shrink-0" },
      { field: "assignedToName", width: "min-w-[140px]" },
      { field: "expectedCloseDate", width: "w-32 shrink-0" },
      { field: "createdAt", width: "w-28 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Pipeline", fields: ["stage", "probability", "expectedCloseDate", "actualCloseDate"] },
      { title: "Commercials", fields: ["value", "lostReason"] },
      { title: "Contact", fields: ["contactPerson", "contactEmail", "contactPhone"] },
      { title: "Notes", fields: ["notes"] },
    ],
  },
  form: {
    sections: [
      { title: "Deal", fields: ["name", "stage", "value", "probability"] },
      { title: "Close", fields: ["expectedCloseDate", "actualCloseDate", "lostReason"] },
      { title: "Contact", fields: ["contactPerson", "contactEmail", "contactPhone"] },
      { title: "Notes", fields: ["notes"] },
    ],
  },
};

export interface DealStageOption {
  readonly key: string;
  readonly label: string;
  readonly stageType: "open" | "won" | "lost" | "archived";
}

const STAGE_TONES: Record<DealStageOption["stageType"], FieldTone> = {
  open: "info",
  won: "success",
  lost: "danger",
  archived: "neutral",
};

export function withDealStages(
  layout: RecordLayout,
  stages: readonly DealStageOption[],
): RecordLayout {
  if (stages.length === 0) return layout;

  const options: SelectOption[] = stages.map((stage) => ({
    value: stage.key,
    label: stage.label,
    tone: STAGE_TONES[stage.stageType],
  }));

  return {
    ...layout,
    fields: layout.fields.map((field) =>
      field.name === "stage" ? { ...field, options } : field,
    ),
  };
}

export function dealRecordFields(deal: Deal): Record<string, unknown> {
  return {
    id: deal.id,
    name: deal.name,
    reference: formatDealId(deal.id),
    stage: deal.stage,
    value: deal.value,
    probability: deal.probability,
    expectedCloseDate: deal.expectedCloseDate,
    actualCloseDate: deal.actualCloseDate,
    contactPerson: deal.contactPerson,
    contactEmail: deal.contactEmail,
    contactPhone: deal.contactPhone,
    lostReason: deal.lostReason,
    notes: deal.notes,
    assignedToName: deal.assignedTo?.name ?? null,
    createdAt: deal.createdAt,
  };
}
