import { Plus, Archive } from "lucide-react";
import type { BuildHeaderAction } from "@/features/build/shared/build-header-actions-plan";
import type { ManagedProductInsights } from "@/hooks/api/build/managed-products-schema";

export function stubOwnerOf(_id: string | null) {
  return _id ? { name: "Priya Nair", email: "priya@example.com" } : null;
}

export const STUB_EDIT = () => undefined;
export const STUB_DELETE = () => undefined;
export const STUB_CHANGE = () => undefined;

export const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

export const SORT_OPTIONS = [
  { value: "all", label: "Default" },
  { value: "name", label: "Name" },
  { value: "updated", label: "Last updated" },
];

export const RANGE_OPTIONS = [
  { label: "All time", value: "all" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
];

export const ONE_ACTION: BuildHeaderAction[] = [
  { id: "create", label: "New product", icon: Plus, primary: true },
];

export const TWO_ACTIONS: BuildHeaderAction[] = [
  { id: "archive", label: "Archive", icon: Archive },
  ...ONE_ACTION,
];

export const STUB_INSIGHTS_ID = 1;

export const STUB_INSIGHTS_DATA: ManagedProductInsights = {
  linkedProjectCount: 42,
  projectsByStatus: { active: 27, completed: 8, archived: 7 },
  submissionsByStatus: { open: 17, in_progress: 5, resolved: 14, archived: 6 },
  roadmapItemCount: 9,
  roadmapItemsByStatus: { planned: 4, in_progress: 3, completed: 1, cancelled: 1 },
  feedbackByStatus: { open: 11, planned: 3, in_progress: 4, completed: 6, declined: 2 },
  linkedFeedbackVoteCount: 38,
  ageDays: 120,
  confidenceScore: null,
  overrideReason: null,
  overriddenBy: null,
  overriddenAt: null,
};
