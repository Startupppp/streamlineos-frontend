import { BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";

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

export const ROADMAP_FILTER_DEFS = [
  { param: "status", options: ROADMAP_STATUS_OPTS.map((o) => o.value) },
  { param: "horizon" },
  { param: "sort", options: ROADMAP_SORT_OPTS.map((o) => o.value) },
] as const;
