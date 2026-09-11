import { SemanticBadge } from "@/components/ui/semantic-badge";
import type { BadgeTone } from "@/components/ui/semantic-badge";

const STATUS_TONES: Record<string, BadgeTone> = {
  PENDING: "warning",
  APPROVED: "info",
  REJECTED: "danger",
  PAID: "success",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAID: "Paid",
};

interface ReimbursementStatusBadgeProps {
  status: string | null;
}

export function ReimbursementStatusBadge({ status }: ReimbursementStatusBadgeProps) {
  if (!status) return <span className="text-micro text-muted-foreground">—</span>;
  return (
    <SemanticBadge
      tone={STATUS_TONES[status] ?? "neutral"}
      label={STATUS_LABELS[status] ?? status}
      size="xs"
      className="rounded"
    />
  );
}
