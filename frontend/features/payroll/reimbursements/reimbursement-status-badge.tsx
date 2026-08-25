import { SemanticBadge } from "@/components/ui/semantic-badge";
import type { BadgeTone } from "@/components/ui/semantic-badge";

type Status = "PENDING" | "APPROVED" | "REJECTED" | "PAID" | null;

const STATUS_TONES: Record<NonNullable<Status>, BadgeTone> = {
  PENDING: "warning",
  APPROVED: "info",
  REJECTED: "danger",
  PAID: "success",
};

const STATUS_LABELS: Record<NonNullable<Status>, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAID: "Paid",
};

interface ReimbursementStatusBadgeProps {
  status: Status;
}

export function ReimbursementStatusBadge({ status }: ReimbursementStatusBadgeProps) {
  if (!status) return <span className="text-micro text-muted-foreground">—</span>;
  return (
    <SemanticBadge
      tone={STATUS_TONES[status]}
      label={STATUS_LABELS[status]}
      size="xs"
      className="rounded"
    />
  );
}
