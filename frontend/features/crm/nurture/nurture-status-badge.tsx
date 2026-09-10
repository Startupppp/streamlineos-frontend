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

/**
 * The cadence's state, in the detail page's header.
 *
 * There is no enrolment twin any more. An enrolment's status is a column of a
 * record list, and that list is now rendered from
 * `lib/renderer/crm/nurture-layout.ts` — where the tones live as the
 * description's own `options`, including the judgement that `completed` is
 * neutral rather than a success, because a cadence that ran to the end without
 * the customer ever answering is not a win. Keeping a second component with a
 * second tone map beside it is exactly the drift the renderer exists to stop.
 *
 * This one stays because a page header is not a record surface: nothing here
 * renders a row, and the description has no vocabulary for a heading's badge.
 */
export function NurtureSequenceStatusBadge({ status }: { status: NurtureSequenceStatus }) {
  return (
    <Badge variant="outline" className={toneBadgeClass(SEQUENCE_TONES[status] ?? "neutral")}>
      {NURTURE_SEQUENCE_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
