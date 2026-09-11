import type { CrmPipelineType, CrmStageType } from "@/types/crm/metadata";

export const PIPELINE_TYPES: { value: CrmPipelineType; label: string; badgeClass: string }[] = [
  { value: "lead", label: "Lead", badgeClass: "bg-status-info-surface text-status-info-ink border-status-info-rule" },
  { value: "deal", label: "Deal", badgeClass: "bg-status-success-surface text-status-success-ink border-status-success-rule" },
  { value: "renewal", label: "Renewal", badgeClass: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule" },
  { value: "customer_success", label: "CS", badgeClass: "bg-status-info-surface text-status-info-ink border-status-info-rule" },
  { value: "partner", label: "Partner", badgeClass: "bg-status-info-surface text-status-info-ink border-status-info-rule" },
  { value: "custom", label: "Custom", badgeClass: "bg-muted text-muted-foreground border-border" },
];

export const STAGE_TYPES: { value: CrmStageType; label: string; className: string }[] = [
  { value: "open", label: "Open", className: "text-status-info-ink" },
  { value: "won", label: "Won", className: "text-status-success-ink" },
  { value: "lost", label: "Lost", className: "text-status-danger-ink" },
  { value: "archived", label: "Archived", className: "text-muted-foreground" },
];

export function getPipelineTypeMeta(type: CrmPipelineType | null) {
  if (type === null) return PIPELINE_TYPES[5];
  return PIPELINE_TYPES.find((t) => t.value === type) ?? PIPELINE_TYPES[5];
}

export function slugify(val: string) {
  return val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
