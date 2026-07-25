"use client";

import { SemanticBadge } from "@/components/ui/semantic-badge";
import type { BadgeTone } from "@/components/ui/semantic-badge";
import type { ComponentType } from "@/types/payroll/setup";

const TYPE_CONFIG: Record<ComponentType, { label: string; tone: BadgeTone }> = {
  EARNING: { label: "Earning", tone: "success" },
  DEDUCTION: { label: "Deduction", tone: "danger" },
  EMPLOYER_CONTRIBUTION: { label: "Employer", tone: "info" },
  REIMBURSEMENT: { label: "Reimb.", tone: "teal" },
  TAX: { label: "Tax", tone: "warning" },
  ADJUSTMENT: { label: "Adjustment", tone: "neutral" },
};

type ComponentTypeBadgeProps = {
  type: ComponentType;
  className?: string;
};

export function ComponentTypeBadge({ type, className }: ComponentTypeBadgeProps) {
  const config = TYPE_CONFIG[type];
  return <SemanticBadge tone={config.tone} label={config.label} size="xs" className={className} />;
}
