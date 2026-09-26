"use client";

import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import type { DataTableColumn } from "@/components/ui/data-table";
import { resolveImageUrl } from "@/lib/utils";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import { BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";
import type {
  PaginatedFeedbucketSubmissions,
  FeedbucketSubmissionType,
  FeedbucketSubmissionStatus,
} from "@/types/feedbucket";

export type SubmissionRow = PaginatedFeedbucketSubmissions["data"][number];

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

export const STATUS_VARIANTS: Record<
  FeedbucketSubmissionStatus,
  "default" | "secondary" | "outline"
> = {
  open: "default",
  in_progress: "secondary",
  resolved: "outline",
  archived: "outline",
};

export const STATUS_LABELS: Record<FeedbucketSubmissionStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  archived: "Archived",
};

export const TYPE_OPTIONS = [
  "bug",
  "idea",
  "feature",
  "question",
  "praise",
  "other",
] as const;

export const STATUS_OPTIONS_VALUES = [
  "open",
  "in_progress",
  "resolved",
  "archived",
] as const;

export const TYPE_FILTER_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All types" },
  { value: "bug", label: "Bug" },
  { value: "idea", label: "Idea" },
  { value: "feature", label: "Feature" },
  { value: "question", label: "Question" },
  { value: "praise", label: "Praise" },
  { value: "other", label: "Other" },
];

export const STATUS_FILTER_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "archived", label: "Archived" },
];

export const LINKED_FILTER_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All" },
  { value: "linked", label: "Linked to ticket" },
  { value: "unlinked", label: "Not linked" },
];

export const DUPLICATE_FILTER_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All submissions" },
  { value: "true", label: "Duplicates only" },
  { value: "false", label: "Not duplicates" },
];

export const FILTER_DEFINITIONS = [
  { param: "type", options: [...TYPE_OPTIONS] },
  { param: "status", options: [...STATUS_OPTIONS_VALUES] },
  { param: "linked", options: ["linked", "unlinked"] as const },
  { param: "assigneeId" },
  { param: "duplicate", options: ["true", "false"] as const },
  { param: "from" },
  { param: "to" },
] as const;

export const FEEDBACK_SKELETON_HEADERS = ["", "Type", "Message", "Status", "Age"] as const;

export function formatAge(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return formatDistanceToNow(date, { addSuffix: true });
}

export const FEEDBACK_COLUMNS: DataTableColumn<SubmissionRow>[] = [
  {
    key: "screenshot",
    header: "",
    cell: (row) =>
      row.screenshotUrl ? (
        <img
          src={resolveImageUrl(row.screenshotUrl) ?? row.screenshotUrl}
          alt="Screenshot"
          loading="lazy"
          decoding="async"
          className="h-10 w-14 rounded border border-border object-cover flex-shrink-0"
        />
      ) : (
        <div className="h-10 w-14 rounded border border-border bg-muted flex-shrink-0" />
      ),
    className: "w-[72px] pr-0",
  },
  {
    key: "type",
    header: "Type",
    cell: (row) => (
      <Badge variant={TYPE_VARIANTS[row.type]} className="text-xs">
        {TYPE_LABELS[row.type]}
      </Badge>
    ),
    className: "w-[90px]",
  },
  {
    key: "message",
    header: "Message",
    cell: (row) => (
      <span className="max-w-xs text-sm text-foreground line-clamp-2">{row.message}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <Badge variant={STATUS_VARIANTS[row.status]} className="text-xs">
        {STATUS_LABELS[row.status]}
      </Badge>
    ),
    className: "w-[110px] hidden sm:table-cell",
  },
  {
    key: "age",
    header: "Age",
    cell: (row) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatAge(row.createdAt)}
      </span>
    ),
    className: "hidden sm:table-cell w-[120px] text-right",
  },
];

export function ProductFeedbackMobileCard({ row }: { row: SubmissionRow }) {
  return (
    <BuildMobileCard
      title={row.message}
      status={
        <Badge variant={STATUS_VARIANTS[row.status]} className="text-xs">
          {STATUS_LABELS[row.status]}
        </Badge>
      }
      person={
        row.reporterName !== null || row.reporterEmail !== null
          ? {
              user: { name: row.reporterName, email: row.reporterEmail },
              role: "From",
            }
          : undefined
      }
      meta={[
        {
          label: "Type",
          value: (
            <Badge variant={TYPE_VARIANTS[row.type]} className="text-xs">
              {TYPE_LABELS[row.type]}
            </Badge>
          ),
        },
        { label: "Age", value: formatAge(row.createdAt) },
      ]}
    />
  );
}
