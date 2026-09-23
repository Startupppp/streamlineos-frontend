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

export const RICE_REACH_MIN = 0;
export const RICE_REACH_MAX = 1_000_000;
export const RICE_IMPACT_MIN = 1;
export const RICE_IMPACT_MAX = 5;
export const RICE_CONFIDENCE_MIN = 0;
export const RICE_CONFIDENCE_MAX = 100;
export const RICE_EFFORT_MIN = 1;
export const RICE_EFFORT_MAX = 10_000;

export const RICE_IMPACT_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "1 — Minimal" },
  { value: 2, label: "2 — Low" },
  { value: 3, label: "3 — Medium" },
  { value: 4, label: "4 — High" },
  { value: 5, label: "5 — Massive" },
];

export const RICE_UNAVAILABLE_LABEL: Record<string, string> = {
  missing_inputs: "Not scored",
  non_positive_effort: "Effort must be at least 1",
};

export const ROADMAP_DELIVERY_SOURCE_LABEL: Record<string, string> = {
  epic_ticket: "Epic",
  project: "Project",
  none: "Not linked to delivery work",
};
