import { BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";
import { ROADMAP_SORTS } from "@/hooks/api/build/roadmap";
import { ROADMAP_STATUS_OPTIONS } from "./roadmap-constants";

export const ROADMAP_FILTER_STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  ...ROADMAP_STATUS_OPTIONS,
];

export const ROADMAP_SORT_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "Default order" },
  { value: "updated_at", label: "Recently updated" },
  { value: "created_at", label: "Recently created" },
  { value: "title", label: "Title" },
] as const;

export const FILTER_DEFINITIONS = [
  { param: "tab", options: ["roadmap", "feedback", "changelog"] },
  { param: "productId" },
  {
    param: "status",
    options: ["planned", "in_progress", "completed", "cancelled"],
  },
  { param: "sort", options: ROADMAP_SORTS },
  { param: "projectId" },
  { param: "horizon" },
  { param: "ownerId" },
] as const;
