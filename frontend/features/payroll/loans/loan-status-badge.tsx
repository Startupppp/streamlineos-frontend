"use client";

import { cn } from "@/lib/utils";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import type { BadgeTone } from "@/components/ui/semantic-badge";
import type { LoanStatus } from "@/hooks/api/payroll/loans-admin";

const STATUS_TONES: Record<LoanStatus, BadgeTone> = {
  PENDING: "warning",
  APPROVED: "info",
  ACTIVE: "success",
  REPAID: "neutral",
  REJECTED: "danger",
};

const STATUS_LABELS: Record<LoanStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  ACTIVE: "Active",
  REPAID: "Repaid",
  REJECTED: "Rejected",
};

interface LoanStatusBadgeProps {
  status: LoanStatus;
  className?: string;
}

export function LoanStatusBadge({ status, className }: LoanStatusBadgeProps) {
  return (
    <SemanticBadge
      tone={STATUS_TONES[status]}
      label={STATUS_LABELS[status]}
      size="xs"
      className={cn(className)}
    />
  );
}
