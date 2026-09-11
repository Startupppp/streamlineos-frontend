import { SemanticBadge } from "@/components/ui/semantic-badge";
import type { BadgeTone } from "@/components/ui/semantic-badge";

const STATUS_CONFIG: Record<string, { label: string; tone: BadgeTone }> = {
  PENDING: { label: "Pending", tone: "neutral" },
  HR_REVIEW: { label: "HR Review", tone: "info" },
  FINANCE_REVIEW: { label: "Finance Review", tone: "info" },
  APPROVED: { label: "Approved", tone: "success" },
  PAID: { label: "Paid", tone: "green" },
};

const FALLBACK: { label: string; tone: BadgeTone } = { label: "Unknown", tone: "neutral" };

interface FnfStatusBadgeProps {
  status: string;
}

export function FnfStatusBadge({ status }: FnfStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? FALLBACK;
  return <SemanticBadge tone={config.tone} label={config.label} size="xs" />;
}
