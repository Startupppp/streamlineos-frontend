import { SemanticBadge } from "@/components/ui/semantic-badge";
import type { BadgeTone } from "@/components/ui/semantic-badge";

type Status = "PENDING" | "APPROVED" | "REJECTED" | "PAID";

const STATUS_TONES: Record<Status, BadgeTone> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  PAID: "green",
};

const STATUS_LABELS: Record<Status, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAID: "Paid",
};

interface BonusStatusBadgeProps {
  status: string;
}

export function BonusStatusBadge({ status }: BonusStatusBadgeProps) {
  const key = status as Status;
  const tone: BadgeTone = STATUS_TONES[key] ?? "neutral";
  const label = STATUS_LABELS[key] ?? status;
  return <SemanticBadge tone={tone} label={label} size="xs" className="rounded" />;
}
