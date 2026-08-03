"use client";

import { SemanticBadge } from "@/components/ui/semantic-badge";
import type { BadgeTone } from "@/components/ui/semantic-badge";
import type { ReimbursementStatus, LoanStatus } from "@/types/payroll/ess";

type EssStatusVariant = ReimbursementStatus | LoanStatus | "OPEN" | "CLOSED" | "LOCKED" | "OLD" | "NEW" | "DRAFT" | "APPROVED" | "ACTIVE" | "PENDING" | "REJECTED" | "PAID";

const STATUS_CONFIG: Record<string, { label: string; tone: BadgeTone }> = {
  PENDING: { label: "Pending", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  PAID: { label: "Paid", tone: "success" },
  ACTIVE: { label: "Active", tone: "info" },
  CLOSED: { label: "Closed", tone: "neutral" },
  DRAFT: { label: "Draft", tone: "neutral" },
  OPEN: { label: "Open", tone: "success" },
  LOCKED: { label: "Locked", tone: "neutral" },
  OLD: { label: "Old Regime", tone: "info" },
  NEW: { label: "New Regime", tone: "info" },
  SUBMITTED: { label: "Submitted", tone: "info" },
};

const FALLBACK_TONE: BadgeTone = "neutral";

interface EssStatusBadgeProps {
  status: EssStatusVariant | string;
  className?: string;
}

export function EssStatusBadge({ status, className }: EssStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, tone: FALLBACK_TONE };
  return <SemanticBadge tone={config.tone} label={config.label} className={className} />;
}
