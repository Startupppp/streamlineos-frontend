"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  CircleSlash,
  Lock,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ProjectStatus, RequirementStatus, RiskReason } from "@/hooks/api/inventory/projects";

/**
 * Status is an icon plus a word, never colour alone.
 *
 * Half a warehouse reads these on a phone in daylight and some readers cannot
 * separate red from green at all. The colour is a second signal on top of the
 * label and the glyph, never the only one.
 */
const REQUIREMENT: Record<RequirementStatus, { label: string; icon: typeof CircleDashed; className: string }> = {
  DRAFT: { label: "Draft", icon: CircleDashed, className: "border-status-neutral-rule text-status-neutral-ink" },
  REQUESTED: { label: "Requested", icon: CircleDashed, className: "border-status-info-rule text-status-info-ink" },
  RESERVED: { label: "Reserved", icon: Lock, className: "border-status-info-rule text-status-info-ink" },
  PARTIALLY_FULFILLED: { label: "Part reserved", icon: Truck, className: "border-status-warning-rule text-status-warning-ink" },
  FULFILLED: { label: "Delivered", icon: CheckCircle2, className: "border-status-success-rule text-status-success-ink" },
  CANCELLED: { label: "Cancelled", icon: CircleSlash, className: "border-status-neutral-rule text-status-neutral-ink" },
};

const PROJECT: Record<ProjectStatus, { label: string; className: string }> = {
  PLANNING: { label: "Planning", className: "border-status-neutral-rule text-status-neutral-ink" },
  ACTIVE: { label: "Active", className: "border-status-success-rule text-status-success-ink" },
  ON_HOLD: { label: "On hold", className: "border-status-warning-rule text-status-warning-ink" },
  COMPLETED: { label: "Completed", className: "border-status-info-rule text-status-info-ink" },
  CANCELLED: { label: "Cancelled", className: "border-status-neutral-rule text-status-neutral-ink" },
};

export function RequirementStatusBadge({ status }: { status: RequirementStatus }) {
  const s = REQUIREMENT[status];
  const Icon = s.icon;
  return (
    <Badge variant="outline" className={`h-5 gap-1 text-micro ${s.className}`}>
      <Icon className="h-2.5 w-2.5" aria-hidden="true" />
      {s.label}
    </Badge>
  );
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const s = PROJECT[status];
  return (
    <Badge variant="outline" className={`h-5 text-micro ${s.className}`}>
      {s.label}
    </Badge>
  );
}

/** The two ways a line goes wrong, said in the words an operator would use. */
export const RISK_COPY: Record<Exclude<RiskReason, null>, string> = {
  SHORT_NO_STOCK: "Short, and there is not enough on the shelf to close it",
  SHORT_AND_DUE: "Short, and the date is inside the supplier lead time",
};

export function AtRiskBadge({ reason }: { reason: RiskReason }) {
  if (!reason) return null;
  return (
    <Badge
      variant="outline"
      className="h-5 gap-1 border-status-danger-rule text-micro text-status-danger-ink"
      title={RISK_COPY[reason]}
    >
      <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
      At risk
    </Badge>
  );
}
