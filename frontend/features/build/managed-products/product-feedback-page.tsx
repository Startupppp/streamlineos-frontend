"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyInboxIllustration } from "@/components/illustrations";
import { PmPageShell, PmSection, PM_FILL_PANEL } from "@/components/pm-chrome";
import { useFeedbucketSubmissions } from "@/hooks/api/feedbucket";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { resolveImageUrl } from "@/lib/utils";
import type {
  PaginatedFeedbucketSubmissions,
  FeedbucketSubmissionType,
  FeedbucketSubmissionStatus,
} from "@/types/feedbucket";

type SubmissionRow = PaginatedFeedbucketSubmissions["data"][number];

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

function formatAge(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return formatDistanceToNow(date, { addSuffix: true });
}

const FEEDBACK_COLUMNS: DataTableColumn<SubmissionRow>[] = [
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

interface ProductFeedbackPageProps {
  managedProductId: number;
}

export function ProductFeedbackPage({ managedProductId }: ProductFeedbackPageProps) {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useFeedbucketSubmissions({
    managedProductId,
    page,
    limit: PAGE_SIZE,
  });

  const resolution = usePageState({
    permission: "feedbucket:submissions:view",
    isLoading,
    isError,
    error,
  });

  function handleRowClick(row: SubmissionRow) {
    router.push(`/build/feedbucket/${row.id}`);
  }

  function handleRetry() {
    void refetch();
  }

  function handlePageChange(next: number) {
    setPage(next);
  }

  return (
    <PageWrapper
      title="Feedback"
      subtitle="Submissions collected from widgets linked to this product"
    >
      <PmPageShell>
        <PmSection index={0} className="flex flex-1 min-h-0 flex-col">
          <PageState
            resolution={resolution}
            loading={<DataTableSkeleton rows={10} columns={5} />}
            onRetry={handleRetry}
            className={PM_FILL_PANEL}
          >
            <DataTable
              data={data?.data ?? []}
              columns={FEEDBACK_COLUMNS}
              getRowKey={(row) => row.id}
              onRowClick={handleRowClick}
              pagination={{
                mode: "server",
                page,
                pageSize: PAGE_SIZE,
                total: data?.total ?? 0,
                onPageChange: handlePageChange,
              }}
              className="flex flex-1 min-h-0 h-full border-0 rounded-none"
              emptyState={
                <EmptyState
                  illustration={<EmptyInboxIllustration className="h-24 w-24" />}
                  title="No feedback submissions"
                  description="Submissions from widgets linked to this product will appear here."
                  className={PM_FILL_PANEL}
                />
              }
              rowClassName={() => "cursor-pointer"}
            />
          </PageState>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
