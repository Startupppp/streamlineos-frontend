import type { RoadmapStatus, FeedbackStatus, ChangelogType } from "@/types/projects";

export const ROADMAP_COLUMNS: { status: RoadmapStatus; label: string }[] = [
  { status: "planned", label: "Planned" },
  { status: "in_progress", label: "In Progress" },
  { status: "completed", label: "Completed" },
  { status: "cancelled", label: "Cancelled" },
];

export const ROADMAP_STATUS_OPTIONS: { value: RoadmapStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const FEEDBACK_STATUS_OPTIONS: { value: FeedbackStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "declined", label: "Declined" },
];

export const CHANGELOG_TYPE_OPTIONS: { value: ChangelogType; label: string }[] = [
  { value: "feature", label: "Feature" },
  { value: "improvement", label: "Improvement" },
  { value: "fix", label: "Fix" },
];

export const FEEDBACK_STATUS_VARIANT: Record<string, "secondary" | "default" | "outline" | "destructive"> = {
  open: "secondary",
  planned: "outline",
  in_progress: "default",
  completed: "default",
  declined: "destructive",
};

export const CHANGELOG_TYPE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  feature: "default",
  improvement: "secondary",
  fix: "outline",
};
