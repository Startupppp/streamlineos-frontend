import { Badge } from "@/components/ui/badge";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import {
  NURTURE_ENROLLMENT_STATUS_LABELS,
  NURTURE_SEQUENCE_STATUS_LABELS,
  type NurtureEnrollmentStatus,
  type NurtureSequenceStatus,
} from "@/types/crm/nurture";

const SEQUENCE_TONES: Record<NurtureSequenceStatus, StatusTone> = {
  draft: "neutral",
  active: "success",
  paused: "warning",
};

/**
 * `completed` is neutral rather than a success.
 *
 * A cadence that ran to the end without the customer ever answering is not a
 * win — `replied` is the outcome the feature is judged on, and colouring "ran
 * out of steps" green would put the two on the same footing.
 */
const ENROLLMENT_TONES: Record<NurtureEnrollmentStatus, StatusTone> = {
  active: "info",
  completed: "neutral",
  exited: "neutral",
  failed: "danger",
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

export function NurtureEnrollmentStatusBadge({ status }: { status: NurtureEnrollmentStatus }) {
  return (
    <Badge variant="outline" className={toneBadgeClass(ENROLLMENT_TONES[status] ?? "neutral")}>
      {NURTURE_ENROLLMENT_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
