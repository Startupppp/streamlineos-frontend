"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { EmptyInboxIllustration } from "@/components/illustrations";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useFeedbucketSubmissions } from "@/hooks/api/feedbucket";
import type {
  FeedbucketSubmission,
  FeedbucketSubmissionType,
  FeedbucketSubmissionStatus,
} from "@/types/feedbucket";

const TYPE_LABELS: Record<FeedbucketSubmissionType, string> = {
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

const STATUS_LABELS: Record<FeedbucketSubmissionStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  archived: "Archived",
};

const PAGE_SIZE = 25;

function formatSubmissionAge(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return formatDistanceToNow(date, { addSuffix: true });
}

const SUBMISSION_COLUMNS: DataTableColumn<FeedbucketSubmission>[] = [
  {
    key: "screenshot",
    header: "",
    cell: (row) =>
      row.screenshotUrl ? (
        <img
          src={row.screenshotUrl}
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
      <TruncatedText
        text={row.message}
        lines={2}
        className="max-w-xs text-sm text-foreground"
      />
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
        {formatSubmissionAge(row.createdAt)}
      </span>
    ),
    className: "hidden sm:table-cell w-[120px] text-right",
  },
];

interface ProjectSubmissionsInboxProps {
  widgetId: number;
  projectId: number;
}

export function ProjectSubmissionsInbox({
  widgetId,
  projectId,
}: ProjectSubmissionsInboxProps) {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useFeedbucketSubmissions({
    page,
    limit: PAGE_SIZE,
    widgetId,
  });

  function handleRowClick(row: FeedbucketSubmission) {
    router.push(`/build/${projectId}/feedbucket/${row.id}`);
  }

  function handleRetry() {
    void refetch();
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 min-h-0 h-full flex-col gap-2 p-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        className="flex flex-1 min-h-0 h-full"
        description="Failed to load submissions."
        onRetry={handleRetry}
      />
    );
  }

  return (
    <DataTable
      data={data?.data ?? []}
      columns={SUBMISSION_COLUMNS}
      getRowKey={(row) => row.id}
      onRowClick={handleRowClick}
      pagination={{
        mode: "server",
        page,
        pageSize: PAGE_SIZE,
        total: data?.total ?? 0,
        onPageChange: setPage,
      }}
      className="flex flex-1 min-h-0 h-full border-0 rounded-none"
      emptyState={
        <EmptyState
          illustration={<EmptyInboxIllustration className="h-24 w-24" />}
          title="No submissions yet"
          description="Submissions from this widget will appear here once users submit feedback."
          className="flex flex-1 min-h-0 h-full flex-col"
        />
      }
      rowClassName={() => "cursor-pointer"}
    />
  );
}
