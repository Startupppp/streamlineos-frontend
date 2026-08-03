import { SemanticBadge } from "@/components/ui/semantic-badge";
import type { BadgeTone } from "@/components/ui/semantic-badge";
import type { FnfStatus } from "@/types/payroll";

const STATUS_CONFIG: Record<FnfStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: "Pending", tone: "neutral" },
  HR_REVIEW: { label: "HR Review", tone: "info" },
  FINANCE_REVIEW: { label: "Finance Review", tone: "info" },
  APPROVED: { label: "Approved", tone: "success" },
  PAID: { label: "Paid", tone: "green" },
};

interface FnfStatusBadgeProps {
  status: FnfStatus;
}

export function FnfStatusBadge({ status }: FnfStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return <SemanticBadge tone={config.tone} label={config.label} size="xs" />;
}
