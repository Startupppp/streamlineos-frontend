import { formatDealId } from "@/lib/format-utils";
import type { Deal } from "@/types/crm";
import type { FieldTone, RecordLayout, SelectOption } from "../layout";

/**
 * Deals, as data.
 *
 * Two things a deal carries that the vocabulary cannot state, and both are
 * supplied here rather than worked around on a screen.
 *
 * Its stages are the tenant's own — a pipeline an administrator configured, not
 * an enum — so `stage` ships with no options and `withDealStages` fills them
 * from the pipeline the organisation actually uses. A hardcoded list would be a
 * form offering values the API rejects for every tenant that renamed a stage.
 *
 * And two of its columns are derived rather than sent: the human deal reference
 * is computed from the id, and the owner arrives as a nested `assignedTo`
 * object the engine has no path syntax to reach. `dealRecordFields` flattens
 * both into named fields, which is why they can be described at all; they are
 * read-only because neither is a thing the API accepts back.
 *
 * The detail sections carry the deal's own facts and nothing else. The
 * reference, the owner and the dates are columns rather than sections because
 * the detail page's header and sidebar already state them, and a record view
 * that repeats its own page header twice is noise, not information.
 *
 * Neither `value` nor `probability` carries a `sign`. A sign is a verdict —
 * above zero is good news, below it is bad — and a deal's value is a quantity,
 * a probability a likelihood. Tinting them would be the engine inventing a
 * judgement the number does not make.
 */
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
      // `CreateDealInput` has no such key; only the update DTO accepts it, and a
      // deal being created has not closed.
      editOnly: true,
    },
    { name: "contactPerson", label: "Contact", kind: "text" },
    { name: "contactEmail", label: "Contact email", kind: "email" },
    { name: "contactPhone", label: "Contact phone", kind: "phone" },
    {
      name: "lostReason",
      label: "Lost reason",
      kind: "text",
      // Update accepts it, create does not — a deal cannot be born lost.
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
      { field: "name", primary: true, sortable: true, subtitle: "contactPerson" },
      { field: "value", sortable: true, width: "w-32 shrink-0" },
      { field: "stage", width: "w-32 shrink-0" },
      { field: "probability", sortable: true, width: "w-24 shrink-0" },
      { field: "assignedToName", width: "min-w-[140px]" },
      { field: "expectedCloseDate", sortable: true, width: "w-32 shrink-0" },
      { field: "createdAt", sortable: true, width: "w-28 shrink-0" },
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

/**
 * A pipeline stage as the layout needs it.
 *
 * Structural rather than an import of `CrmPipelineStage`, so the description
 * stays a description: it needs a key, a label and which end of the pipeline the
 * stage sits at, and nothing else about how CRM metadata is fetched.
 */
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

/**
 * The description with this organisation's own pipeline in it.
 *
 * Returns the layout untouched when no stages have loaded: a select with an
 * empty option list still renders the stored key, which is the honest thing to
 * show while the pipeline is in flight. Replacing it with an invented list would
 * offer values this tenant does not have.
 */
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

/** One deal in the shape the description names, derived fields included. */
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
