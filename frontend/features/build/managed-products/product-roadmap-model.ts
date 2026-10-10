import { BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";
import type { RoadmapHorizon, RoadmapStatus } from "@/types/projects";

export const ROADMAP_STATUS_OPTS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const ROADMAP_HORIZON_OPTS = [
  { value: BUILD_FILTER_ALL, label: "All horizons" },
  { value: "now", label: "Now" },
  { value: "next", label: "Next" },
  { value: "later", label: "Later" },
];

export const ROADMAP_SORT_OPTS = [
  { value: BUILD_FILTER_ALL, label: "Default order" },
  { value: "updated_at", label: "Last updated" },
  { value: "created_at", label: "Created" },
  { value: "title", label: "Title A–Z" },
];

export const ROADMAP_CONFIDENCE_OPTS = [
  { value: BUILD_FILTER_ALL, label: "Any confidence" },
  { value: "25", label: "≥ 25%" },
  { value: "50", label: "≥ 50%" },
  { value: "75", label: "≥ 75%" },
];

export const ROADMAP_VIEW_OPTS = ["board", "timeline"] as const;
export type RoadmapViewMode = (typeof ROADMAP_VIEW_OPTS)[number];

const HORIZON_VALUES: readonly string[] = ["now", "next", "later"];
const STATUS_VALUES: readonly string[] = ["planned", "in_progress", "completed", "cancelled"];

export function isRoadmapHorizon(v: string): v is RoadmapHorizon {
  return HORIZON_VALUES.includes(v);
}

export function isRoadmapStatus(v: string): v is RoadmapStatus {
  return STATUS_VALUES.includes(v);
}

export const ROADMAP_FILTER_DEFS = [
  { param: "status", options: ROADMAP_STATUS_OPTS.map((o) => o.value) },
  { param: "horizon", options: ROADMAP_HORIZON_OPTS.map((o) => o.value) },
  { param: "sort", options: ROADMAP_SORT_OPTS.map((o) => o.value) },
  { param: "teamId" },
  { param: "goalId" },
  { param: "segment" },
  { param: "confidenceMin", options: ROADMAP_CONFIDENCE_OPTS.map((o) => o.value) },
  { param: "targetFrom" },
  { param: "targetTo" },
] as const;
