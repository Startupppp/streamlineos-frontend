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
  meeting: "text-blue-600 border-blue-200",
  standup: "text-blue-600 border-blue-200",
  retro: "text-amber-600 border-amber-200",
  planning: "text-cyan-600 border-cyan-200",
  review: "text-emerald-600 border-emerald-200",
};

const STATUS_LABEL: Record<MeetingStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_STYLE: Record<MeetingStatus, string> = {
  scheduled: "text-blue-600 border-blue-200",
  in_progress: "text-amber-600 border-amber-200",
  completed: "text-emerald-600 border-emerald-200",
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
  open: "text-blue-600 border-blue-200",
  in_progress: "text-amber-600 border-amber-200",
  done: "text-emerald-600 border-emerald-200",
  converted: "text-blue-600 border-blue-200",
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