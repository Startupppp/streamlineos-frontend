import type { ProjectStatusValue } from "@/types/projects";

export type HealthStatus = "on-track" | "at-risk" | "critical";
export type StatusFilter = "ALL" | ProjectStatusValue;
export type SortKey = "name" | "status" | "progress";
export type ViewMode = "table" | "cards";

export const healthConfig: Record<
  HealthStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  "on-track": {
    label: "On Track",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    dot: "bg-emerald-500",
  },
  "at-risk": {
    label: "At Risk",
    color: "text-amber-600",
    bg: "bg-amber-50",
    dot: "bg-amber-500",
  },
  critical: {
    label: "Critical",
    color: "text-red-600",
    bg: "bg-red-50",
    dot: "bg-red-500",
  },
};

export const statusConfig: Record<ProjectStatusValue, { label: string; color: string }> = {
  ACTIVE: { label: "Active", color: "bg-blue-100 text-blue-700 border-blue-200" },
  COMPLETED: { label: "Completed", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  ARCHIVED: { label: "Archived", color: "bg-slate-100 text-slate-600 border-slate-200" },
};

export const DEFAULT_STATUS_CONFIG = {
  label: "Unknown",
  color: "bg-slate-100 text-slate-600 border-slate-200",
};

export const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "status", label: "Status" },
  { value: "progress", label: "Progress" },
];

export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}
