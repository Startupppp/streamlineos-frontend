import { SemanticBadge } from "@/components/ui/semantic-badge";
import type { BadgeTone } from "@/components/ui/semantic-badge";
import type { TaxWindowStatus } from "@/types/payroll/reports";

const STATUS_CONFIG: Record<TaxWindowStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  OPEN: { label: "Open", tone: "success" },
  CLOSED: { label: "Closed", tone: "neutral" },
  LOCKED: { label: "Locked", tone: "danger" },
};

export function TaxWindowStatusBadge({ status }: { status: TaxWindowStatus }) {
  const config = STATUS_CONFIG[status];
  return <SemanticBadge tone={config.tone} label={config.label} size="xs" />;
}
