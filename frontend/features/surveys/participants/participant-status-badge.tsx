import { Badge } from "@/components/ui/badge";
import type { ParticipantStatus } from "@/hooks/api/surveys/participants";

const VARIANT: Record<ParticipantStatus, "default" | "secondary" | "outline" | "destructive"> = {
  invited: "outline",
  delivered: "outline",
  opened: "outline",
  started: "secondary",
  partial: "secondary",
  completed: "default",
  disqualified: "destructive",
  bounced: "destructive",
  unsubscribed: "destructive",
  expired: "secondary",
};

export function ParticipantStatusBadge({ status }: { status: ParticipantStatus }) {
  return <Badge variant={VARIANT[status]}>{status}</Badge>;
}
