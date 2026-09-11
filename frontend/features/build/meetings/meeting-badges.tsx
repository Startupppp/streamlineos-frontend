import { memo } from "react";

import { StatusMapBadge, type StatusEntry } from "@/components/ui/status-map-badge";

const MEETING_TYPE_MAP: Record<string, StatusEntry> = {
  meeting: { label: "Meeting", tone: "info" },
  standup: { label: "Standup", tone: "info" },
  retro: { label: "Retro", tone: "warning" },
  planning: { label: "Planning", tone: "cyan" },
  review: { label: "Review", tone: "success" },
};

const MEETING_STATUS_MAP: Record<string, StatusEntry> = {
  scheduled: { label: "Scheduled", tone: "info" },
  in_progress: { label: "In Progress", tone: "warning" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral", className: "bg-transparent dark:bg-transparent" },
};

const ACTION_ITEM_STATUS_MAP: Record<string, StatusEntry> = {
  open: { label: "Open", tone: "info" },
  in_progress: { label: "In Progress", tone: "warning" },
  done: { label: "Done", tone: "success" },
  converted: { label: "→ Task", tone: "info" },
  cancelled: { label: "Cancelled", tone: "neutral", className: "bg-transparent dark:bg-transparent" },
};

export const MeetingTypeBadge = memo(function MeetingTypeBadge({ type }: { type: string }) {
  return <StatusMapBadge status={type} map={MEETING_TYPE_MAP} />;
});

export const MeetingStatusBadge = memo(function MeetingStatusBadge({ status }: { status: string }) {
  return <StatusMapBadge status={status} map={MEETING_STATUS_MAP} />;
});

export const ActionItemStatusBadge = memo(function ActionItemStatusBadge({ status }: { status: string }) {
  return <StatusMapBadge status={status} map={ACTION_ITEM_STATUS_MAP} />;
});
