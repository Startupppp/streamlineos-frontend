"use client";

import { forwardRef, useCallback, useMemo, useState, useTransition, type MouseEvent } from "react";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Trash2Icon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { EmptyInboxIllustration } from "@/components/illustrations";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useCan } from "@/hooks/api/access";
import {
  useDeleteFeedbucketSubmission,
  useFeedbucketSubmissions,
} from "@/hooks/api/feedbucket";
import { getErrorMessage } from "@/lib/get-error-message";
import type {
  PaginatedFeedbucketSubmissions,
  FeedbucketSubmissionType,
  FeedbucketSubmissionStatus,
} from "@/types/feedbucket";
import { resolveImageUrl } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

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

const ALL_STATUSES: FeedbucketSubmissionStatus[] = ["open", "in_progress", "resolved", "archived"];
const ALL_TYPES: FeedbucketSubmissionType[] = ["bug", "idea", "feature", "question", "praise", "other"];

const PAGE_SIZE = 25;

function formatSubmissionAge(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return formatDistanceToNow(date, { addSuffix: true });
}

const SUBMISSION_COLUMNS: DataTableColumn<SubmissionRow>[] = [
  {
    key: "screenshot",
    header: "Screenshot",
    headerClassName: "sr-only",
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

interface DeleteSubmissionButtonProps {
  submissionId: number;
  onRequestDelete: (submissionId: number) => void;
}

const DeleteSubmissionButton = forwardRef<HTMLButtonElement, DeleteSubmissionButtonProps>(
  function DeleteSubmissionButton({ submissionId, onRequestDelete }, ref) {
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
  },
);

interface ProjectSubmissionsInboxProps {
  widgetId: number;
  projectId: number;
}

export function ProjectSubmissionsInbox({
  widgetId,
  projectId,
}: ProjectSubmissionsInboxProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [page, setPage] = useState(1);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const canDelete = useCan("feedbucket:submissions:delete");
  const deleteSubmission = useDeleteFeedbucketSubmission();

  const statusFilter = searchParams.get("status") as FeedbucketSubmissionStatus | null;
  const typeFilter = searchParams.get("type") as FeedbucketSubmissionType | null;
  const linkedFilter = searchParams.get("linked") as "linked" | "unlinked" | null;
  const fromFilter = searchParams.get("from");
  const toFilter = searchParams.get("to");
  const hasActiveFilters =
    statusFilter !== null ||
    typeFilter !== null ||
    linkedFilter !== null ||
    fromFilter !== null ||
    toFilter !== null;

  function updateUrlParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    startTransition(() => {
      router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
    });
  }

  function handleStatusChange(value: string) {
    setPage(1);
    updateUrlParam("status", value === "all" ? null : value);
  }

  function handleTypeChange(value: string) {
    setPage(1);
    updateUrlParam("type", value === "all" ? null : value);
  }

  function handleLinkedChange(value: string) {
    setPage(1);
    updateUrlParam("linked", value === "all" ? null : value);
  }

  function handleFromChange(value: string) {
    setPage(1);
    updateUrlParam("from", value || null);
  }

  function handleToChange(value: string) {
    setPage(1);
    updateUrlParam("to", value || null);
  }

  function handleClearFilters() {
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");
    params.delete("type");
    params.delete("linked");
    params.delete("from");
    params.delete("to");
    params.delete("page");
    startTransition(() => {
      router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
    });
  }

  const { data, isLoading, isError, refetch } = useFeedbucketSubmissions({
    page,
    limit: PAGE_SIZE,
    widgetId,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(linkedFilter ? { linked: linkedFilter } : {}),
    ...(fromFilter ? { from: fromFilter } : {}),
    ...(toFilter ? { to: toFilter } : {}),
  });

  function handleRowClick(row: SubmissionRow) {
    router.push(`/build/${projectId}/feedbucket/${row.id}`);
  }

  function handleRetry() {
    void refetch();
  }

  const handleRequestDelete = useCallback((submissionId: number) => {
    setPendingDeleteId(submissionId);
  }, []);

  function handleDeleteDialogChange(open: boolean) {
    if (!open) setPendingDeleteId(null);
  }

  function handleConfirmDelete() {
    if (pendingDeleteId === null) return;
    deleteSubmission.mutate(
      { submissionId: pendingDeleteId },
      {
        onSuccess: () => {
          toast.success("Submission deleted");
          setPendingDeleteId(null);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }

  const columns = useMemo<DataTableColumn<SubmissionRow>[]>(() => {
    if (!canDelete) return SUBMISSION_COLUMNS;
    return [
      ...SUBMISSION_COLUMNS,
      {
        key: "actions",
        header: "Actions",
        headerClassName: "sr-only",
        cell: (row) => (
          <DeleteSubmissionButton submissionId={row.id} onRequestDelete={handleRequestDelete} />
        ),
        className: "w-8",
      },
    ];
  }, [canDelete, handleRequestDelete]);

  const renderSubmissionCard = useCallback(
    (row: SubmissionRow) => (
      <BuildMobileCard
        eyebrow={
          <Badge variant={TYPE_VARIANTS[row.type]}>{TYPE_LABELS[row.type]}</Badge>
        }
        title={<TruncatedText text={row.message} lines={2} />}
        status={
          <Badge variant={STATUS_VARIANTS[row.status]}>
            {STATUS_LABELS[row.status]}
          </Badge>
        }
        meta={[{ label: "Age", value: formatSubmissionAge(row.createdAt) }]}
        actions={
          canDelete ? (
            <DeleteSubmissionButton
              submissionId={row.id}
              onRequestDelete={handleRequestDelete}
            />
          ) : null
        }
      />
    ),
    [canDelete, handleRequestDelete],
  );

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

  const filteredEmptyState = (
    <EmptyState
      illustration={<EmptyInboxIllustration className="h-24 w-24" />}
      title="No matching submissions"
      description="No submissions match your current filters."
      action={{ label: "Clear filters", onClick: handleClearFilters }}
      className="flex flex-1 min-h-0 h-full flex-col"
    />
  );

  const firstRunEmptyState = (
    <EmptyState
      illustration={<EmptyInboxIllustration className="h-24 w-24" />}
      title="No submissions yet"
      description="Submissions from this widget will appear here once users submit feedback."
      className="flex flex-1 min-h-0 h-full flex-col"
    />
  );

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-wrap">
        <Select value={statusFilter ?? "all"} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter ?? "all"} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ALL_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={linkedFilter ?? "all"} onValueChange={handleLinkedChange}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="All submissions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All submissions</SelectItem>
            <SelectItem value="linked">Linked to ticket</SelectItem>
            <SelectItem value="unlinked">Not linked</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          aria-label="From date"
          value={fromFilter ?? ""}
          onChange={(e) => handleFromChange(e.target.value ? `${e.target.value}T00:00:00Z` : "")}
          className="w-[140px]"
        />

        <Input
          type="date"
          aria-label="To date"
          value={toFilter ? toFilter.slice(0, 10) : ""}
          onChange={(e) => handleToChange(e.target.value ? `${e.target.value}T00:00:00Z` : "")}
          className="w-[140px]"
        />
      </div>

      <DataTable
        data={data?.data ?? []}
        columns={columns}
        getRowKey={(row) => row.id}
        onRowClick={handleRowClick}
        mobileCard={renderSubmissionCard}
        pagination={{
          mode: "server",
          page,
          pageSize: PAGE_SIZE,
          total: data?.total ?? 0,
          onPageChange: setPage,
        }}
        className="flex flex-1 min-h-0 h-full border-0 rounded-none"
        emptyState={hasActiveFilters ? filteredEmptyState : firstRunEmptyState}
        rowClassName={() => "cursor-pointer"}
      />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={handleDeleteDialogChange}
        destructive
        title="Delete this submission?"
        description="This submission is removed from the inbox and can no longer be opened. You cannot undo this from here."
        confirmLabel="Delete submission"
        isPending={deleteSubmission.isPending}
        keepOpenOnConfirm
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
