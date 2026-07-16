import type { CrmPipelineType, CrmStageType } from "@/types/crm/metadata";

export const PIPELINE_TYPES: { value: CrmPipelineType; label: string; badgeClass: string }[] = [
  { value: "lead", label: "Lead", badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30" },
  { value: "deal", label: "Deal", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30" },
  { value: "renewal", label: "Renewal", badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30" },
  { value: "customer_success", label: "CS", badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { value: "partner", label: "Partner", badgeClass: "bg-sky-50 text-sky-700 border-sky-200" },
  { value: "custom", label: "Custom", badgeClass: "bg-muted text-muted-foreground border-border" },
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
