"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import type { BadgeTone } from "@/components/ui/semantic-badge";
import type { PayrollRunStatus } from "@/types/payroll/runs";

const STATUS_CONFIG: Record<PayrollRunStatus, { label: string; tone: BadgeTone; icon?: boolean }> = {
  PREPARING: { label: "Preparing", tone: "neutral" },
  DRAFT: { label: "Draft", tone: "accent" },
  PREVIEW_READY: { label: "Preview Ready", tone: "accent" },
  EXCEPTIONS_FOUND: { label: "Exceptions", tone: "warning" },
  PENDING_APPROVAL: { label: "Pending Approval", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  LOCKED: { label: "Locked", tone: "neutral", icon: true },
  PAID: { label: "Paid", tone: "success" },
  PAYSLIPS_PUBLISHED: { label: "Published", tone: "success" },
  CLOSED: { label: "Closed", tone: "neutral" },
  REOPENED: { label: "Reopened", tone: "warning" },
};

interface RunStatusBadgeProps {
  status: PayrollRunStatus;
  className?: string;
}

export function RunStatusBadge({ status, className }: RunStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <SemanticBadge
      tone={config.tone}
      label={config.label}
      icon={config.icon ? <Lock className="h-2.5 w-2.5" /> : undefined}
      size="xs"
      className={cn(className)}
    />
  );
}
