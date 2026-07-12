import type { CrmPipelineType, CrmStageType } from "@/types/crm/metadata";

export const PIPELINE_TYPES: { value: CrmPipelineType; label: string; badgeClass: string }[] = [
  { value: "lead", label: "Lead", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "deal", label: "Deal", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "renewal", label: "Renewal", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "customer_success", label: "CS", badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { value: "partner", label: "Partner", badgeClass: "bg-sky-50 text-sky-700 border-sky-200" },
  { value: "custom", label: "Custom", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
];

export const STAGE_TYPES: { value: CrmStageType; label: string; className: string }[] = [
  { value: "open", label: "Open", className: "text-blue-700" },
  { value: "won", label: "Won", className: "text-emerald-700" },
  { value: "lost", label: "Lost", className: "text-red-700" },
  { value: "archived", label: "Archived", className: "text-slate-500" },
];

export function getPipelineTypeMeta(type: CrmPipelineType) {
  return PIPELINE_TYPES.find((t) => t.value === type) ?? PIPELINE_TYPES[5];
}

export function slugify(val: string) {
  return val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
