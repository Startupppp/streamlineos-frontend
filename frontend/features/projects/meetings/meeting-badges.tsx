import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import type { MeetingType, MeetingStatus, ActionItemStatus } from "@/types/projects";

const TYPE_LABEL: Record<MeetingType, string> = {
  meeting: "Meeting",
  standup: "Standup",
  retro: "Retro",
  planning: "Planning",
  review: "Review",
};

const TYPE_STYLE: Record<MeetingType, string> = {
  meeting:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  standup:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  retro:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  planning:
    "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/30",
  review:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
};

const STATUS_LABEL: Record<MeetingStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_STYLE: Record<MeetingStatus, string> = {
  scheduled:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  in_progress:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  completed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  cancelled: "text-muted-foreground border-border",
};

const AI_STATUS_LABEL: Record<ActionItemStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  done: "Done",
  converted: "→ Task",
  cancelled: "Cancelled",
};

const AI_STATUS_STYLE: Record<ActionItemStatus, string> = {
  open:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  in_progress:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  done:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  converted:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  cancelled: "text-muted-foreground border-border",
};

export const MeetingTypeBadge = memo(function MeetingTypeBadge({ type }: { type: MeetingType }) {
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${TYPE_STYLE[type]}`}>
      {TYPE_LABEL[type]}
    </Badge>
  );
});

export const MeetingStatusBadge = memo(function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </Badge>
  );
});

export const ActionItemStatusBadge = memo(function ActionItemStatusBadge({ status }: { status: ActionItemStatus }) {
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${AI_STATUS_STYLE[status]}`}>
      {AI_STATUS_LABEL[status]}
    </Badge>
  );
});
