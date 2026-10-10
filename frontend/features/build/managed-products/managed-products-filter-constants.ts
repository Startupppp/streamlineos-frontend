import { BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";

export const PAGE_SIZE = 20;

export const STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

export const SORT_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "Default order" },
  { value: "name", label: "Name" },
  { value: "updated", label: "Last updated" },
  { value: "status", label: "Status" },
];

export const LIFECYCLE_FILTER_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All lifecycles" },
  { value: "discovery", label: "Discovery" },
  { value: "build", label: "Build" },
  { value: "growth", label: "Growth" },
  { value: "mature", label: "Mature" },
  { value: "sunset", label: "Sunset" },
];

export const HEALTH_FILTER_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All health" },
  { value: "on_track", label: "On track" },
  { value: "at_risk", label: "At risk" },
  { value: "off_track", label: "Off track" },
  { value: "unknown", label: "Unknown" },
];

export const ARCHIVED_FILTER_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "Active only" },
  { value: "true", label: "Archived only" },
];

export const FILTER_DEFINITIONS = [
  {
    param: "status",
    options: STATUS_OPTIONS.map((option) => option.value),
  },
  {
    param: "sort",
    options: SORT_OPTIONS.map((option) => option.value),
  },
  { param: "ownerId" },
  {
    param: "lifecycle",
    options: LIFECYCLE_FILTER_OPTIONS.map((o) => o.value),
  },
  {
    param: "health",
    options: HEALTH_FILTER_OPTIONS.map((o) => o.value),
  },
  { param: "teamId" },
  { param: "segment" },
  { param: "tag" },
  { param: "linkedProjectId" },
  {
    param: "archived",
    options: [BUILD_FILTER_ALL, "true"],
  },
] as const;
