import { BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";
import type { StatusTone } from "@/lib/design-tokens";
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

export function positiveFilterId(value: string): number | undefined {
  if (!/^\d+$/.test(value)) return undefined;
  const id = Number(value);
  return id > 0 ? id : undefined;
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

export const ROADMAP_HORIZON_TONE: Record<RoadmapHorizon, StatusTone> = {
  now: "success",
  next: "info",
  later: "neutral",
};

export const ROADMAP_HORIZON_CAPTION: Record<RoadmapHorizon, string> = {
  now: "Shipping this cycle",
  next: "Queued after current work",
  later: "Parked until sequenced",
};

export const ROADMAP_HORIZON_EMPTY: Record<RoadmapHorizon, string> = {
  now: "Put work you are shipping now in this column.",
  next: "Stage the next slice after current work.",
  later: "Park ideas that are not sequenced yet.",
};

export function roadmapTargetDate(item: {
  targetEnd?: string | null;
  targetStart?: string | null;
}): string | null {
  const raw = item.targetEnd ?? item.targetStart;
  return raw && raw.length > 0 ? raw : null;
}

export function roadmapVoteLabel(votes: number): string {
  return votes === 1 ? "1 vote" : `${votes} votes`;
}

export function joinReadableMeta(parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(" · ");
}
