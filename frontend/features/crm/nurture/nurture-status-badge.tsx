import { Badge } from "@/components/ui/badge";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import {
  NURTURE_SEQUENCE_STATUS_LABELS,
  type NurtureSequenceStatus,
} from "@/types/crm/nurture";

const SEQUENCE_TONES: Record<NurtureSequenceStatus, StatusTone> = {
  draft: "neutral",
  active: "success",
  paused: "warning",
};

function toneBadgeClass(tone: StatusTone): string {
  const classes = statusToneClasses(tone);
  return cn("h-5 px-2 py-0.5 text-micro", classes.surface, classes.ink, classes.rule);
}

export function NurtureSequenceStatusBadge({ status }: { status: NurtureSequenceStatus }) {
  return (
    <Badge variant="outline" className={toneBadgeClass(SEQUENCE_TONES[status] ?? "neutral")}>
      {NURTURE_SEQUENCE_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
