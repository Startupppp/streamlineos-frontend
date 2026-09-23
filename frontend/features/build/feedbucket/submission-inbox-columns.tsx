"use client";

import { forwardRef, type MouseEvent } from "react";
import { formatDistanceToNow } from "date-fns";
import { Trash2Icon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { DataTableColumn } from "@/components/ui/data-table";
import { resolveImageUrl } from "@/lib/utils";
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

const TYPE_VARIANTS: Record<
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

const STATUS_VARIANTS: Record<
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

function formatSubmissionAge(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return formatDistanceToNow(date, { addSuffix: true });
}

function ScreenshotCell(row: SubmissionRow) {
  return row.screenshotUrl ? (
    <img
      src={resolveImageUrl(row.screenshotUrl) ?? row.screenshotUrl}
      alt="Screenshot"
      loading="lazy"
      decoding="async"
      className="h-10 w-14 rounded border border-border object-cover flex-shrink-0"
    />
  ) : (
    <div className="h-10 w-14 rounded border border-border bg-muted flex-shrink-0" />
  );
}

function TypeCell(row: SubmissionRow) {
  return (
    <Badge variant={TYPE_VARIANTS[row.type]} className="text-xs">
      {TYPE_LABELS[row.type]}
    </Badge>
  );
}

function MessageCell(row: SubmissionRow) {
  return (
    <TruncatedText text={row.message} lines={2} className="max-w-xs text-sm text-foreground" />
  );
}

function StatusCell(row: SubmissionRow) {
  return (
    <Badge variant={STATUS_VARIANTS[row.status]} className="text-xs">
      {STATUS_LABELS[row.status]}
    </Badge>
  );
}

function AgeCell(row: SubmissionRow) {
  return (
    <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
      {formatSubmissionAge(row.createdAt)}
    </span>
  );
}

export const SUBMISSION_COLUMNS: DataTableColumn<SubmissionRow>[] = [
  { key: "screenshot", header: "", cell: ScreenshotCell, className: "w-[72px] pr-0" },
  { key: "type", header: "Type", cell: TypeCell, className: "w-[90px]" },
  { key: "message", header: "Message", cell: MessageCell },
  {
    key: "status",
    header: "Status",
    cell: StatusCell,
    className: "w-[110px] hidden sm:table-cell",
  },
  {
    key: "age",
    header: "Age",
    cell: AgeCell,
    className: "hidden sm:table-cell w-[120px] text-right",
  },
];

interface DeleteSubmissionButtonProps {
  submissionId: number;
  onRequestDelete: (submissionId: number) => void;
}

export const DeleteSubmissionButton = forwardRef<
  HTMLButtonElement,
  DeleteSubmissionButtonProps
>(function DeleteSubmissionButton({ submissionId, onRequestDelete }, ref) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onRequestDelete(submissionId);
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      aria-label="Delete submission"
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-status-danger-ink"
      {...hoverHandlers}
    >
      <Trash2Icon ref={iconRef} size={14} />
    </button>
  );
});
