import { BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";

export const RELEASE_STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "released", label: "Released" },
  { value: "archived", label: "Archived" },
] as const;

export const RELEASE_FILTER_DEFINITIONS = [
  { param: "status", options: RELEASE_STATUS_OPTIONS.map((o) => o.value) },
  { param: "from" },
  { param: "to" },
] as const;

type ReleaseStatus = "draft" | "released" | "archived";

export function isReleaseStatus(value: string): value is ReleaseStatus {
  return value === "draft" || value === "released" || value === "archived";
}

export function readDateFilter(value: string): string | undefined {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}
