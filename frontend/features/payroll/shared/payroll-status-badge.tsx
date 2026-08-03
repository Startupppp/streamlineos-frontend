"use client";

import { cn } from "@/lib/utils";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import type { BadgeTone } from "@/components/ui/semantic-badge";

type PolicyStatus = "DRAFT" | "ACTIVE" | "SUPERSEDED" | "ARCHIVED";
type ComponentStatus = "active" | "inactive";
type RunStatus = "DRAFT" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

const policyStatusConfig: Record<PolicyStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: "Draft", tone: "accent" },
  ACTIVE: { label: "Active", tone: "success" },
  SUPERSEDED: { label: "Superseded", tone: "neutral" },
  ARCHIVED: { label: "Archived", tone: "neutral" },
};

const componentStatusConfig: Record<ComponentStatus, { label: string; tone: BadgeTone }> = {
  active: { label: "Active", tone: "success" },
  inactive: { label: "Inactive", tone: "neutral" },
};

const runStatusConfig: Record<RunStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: "Draft", tone: "accent" },
  PROCESSING: { label: "Processing", tone: "warning" },
  COMPLETED: { label: "Completed", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

type PayrollStatusBadgeProps =
  | { variant: "policy"; status: PolicyStatus; className?: string }
  | { variant: "component"; status: ComponentStatus; className?: string }
  | { variant: "run"; status: RunStatus; className?: string };

export function PayrollStatusBadge(props: PayrollStatusBadgeProps) {
  let config: { label: string; tone: BadgeTone };

  if (props.variant === "policy") {
    config = policyStatusConfig[props.status];
  } else if (props.variant === "component") {
    config = componentStatusConfig[props.status];
  } else {
    config = runStatusConfig[props.status];
  }

  return (
    <SemanticBadge
      tone={config.tone}
      label={config.label}
      className={cn(props.className)}
    />
  );
}
