import { formatDistanceToNow } from "date-fns";
import type {
  FeedbucketSubmissionStatus,
  FeedbucketSubmissionType,
} from "@/types/feedbucket";

export function formatSubmissionAge(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return formatDistanceToNow(date, { addSuffix: true });
}

export const TYPE_LABELS: Record<FeedbucketSubmissionType, string> = {
  bug: "Bug",
  idea: "Idea",
  feature: "Feature",
  question: "Question",
  praise: "Praise",
  other: "Other",
};

export const TYPE_VARIANTS: Record<
  FeedbucketSubmissionType,
  "default" | "secondary" | "outline" | "destructive"
> = {
  bug: "destructive",
  idea: "default",
  feature: "secondary",
  question: "secondary",
  praise: "default",
  other: "outline",
};

export const STATUS_LABELS: Record<FeedbucketSubmissionStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  archived: "Archived",
};

export const STATUS_VARIANTS: Record<
  FeedbucketSubmissionStatus,
  "default" | "secondary" | "outline"
> = {
  open: "default",
  in_progress: "secondary",
  resolved: "outline",
  archived: "outline",
};

export const ALL_STATUSES: FeedbucketSubmissionStatus[] = [
  "open",
  "in_progress",
  "resolved",
  "archived",
];

export const ALL_TYPES: FeedbucketSubmissionType[] = [
  "bug",
  "idea",
  "feature",
  "question",
  "praise",
  "other",
];
