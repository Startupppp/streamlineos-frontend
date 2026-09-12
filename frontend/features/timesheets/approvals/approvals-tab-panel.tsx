"use client";

import { useMemo, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { useApprovals } from "@/hooks/api/timesheets-core/approvals";
import { PERIOD_STATUS_BADGE, PERIOD_STATUS_LABEL } from "@/features/timesheets/types";
import type { PeriodStatus, TimesheetPeriod } from "@/features/timesheets/types";
import { cn } from "@/lib/utils";

export type ApprovalTab = Extract<PeriodStatus, "SUBMITTED" | "APPROVED" | "REJECTED">;

export const ALL_APPROVAL_TABS: ApprovalTab[] = ["SUBMITTED", "APPROVED", "REJECTED"];

export const APPROVAL_TAB_LABEL: Record<ApprovalTab, string> = {
  SUBMITTED: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const TAB_EMPTY: Record<ApprovalTab, string> = {
  SUBMITTED: "No timesheets awaiting approval.",
  APPROVED: "No approved timesheets for this period.",
  REJECTED: "No rejected timesheets for this period.",
};

const PAGE_SIZE = 25;

interface ApprovalsTableProps {
  periods: TimesheetPeriod[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onRowClick: (period: TimesheetPeriod) => void;
  selection: Set<string | number>;
  onSelectionChange: (sel: Set<string | number>) => void;
  canManage: boolean;
  onBulkApprove: () => void;
  onBulkReject: () => void;
  tab: ApprovalTab;
  isBulkPending: boolean;
  hasMore: boolean;
  isFetchingMore: boolean;
  onLoadMore: () => void;
  filtersActive: boolean;
  onClearFilters: () => void;
}

function ApprovalsTable({
  periods,
  isLoading,
  isError,
  onRetry,
  onRowClick,
  selection,
  onSelectionChange,
  canManage,
  onBulkApprove,
  onBulkReject,
  tab,
  isBulkPending,
  hasMore,
  isFetchingMore,
  onLoadMore,
  filtersActive,
  onClearFilters,
}: ApprovalsTableProps) {
  const columns = useMemo<DataTableColumn<TimesheetPeriod>[]>(
    () => [
      {
        key: "member",
        header: "Member",
        cell: (row) => (
          <div>
            <p className="text-dense font-medium">
              {row.user?.name ?? row.user?.email ?? "Unknown user"}
            </p>
            {row.user?.name && (
              <p className="text-micro text-muted-foreground">{row.user.email}</p>
            )}
          </div>
        ),
        sortable: true,
        sortValue: (row) => row.user?.name ?? row.user?.email ?? "",
      },
      {
        key: "period",
        header: "Period",
        cell: (row) => (
          <span className="text-dense tabular-nums">
            {format(parseISO(row.periodStart), "MMM d")} –{" "}
            {format(parseISO(row.periodEnd), "MMM d")}
          </span>
        ),
        sortable: true,
        sortValue: (row) => row.periodStart,
      },
      {
        key: "totalHours",
        header: "Hours",
        headerClassName: "text-right",
        className: "text-right tabular-nums",
        cell: (row) => `${parseFloat(row.totalHours).toFixed(1)}h`,
        sortable: true,
        sortValue: (row) => parseFloat(row.totalHours),
      },
      {
        key: "billableHours",
        header: "Billable",
        headerClassName: "text-right",
        className: "text-right tabular-nums",
        cell: (row) => `${parseFloat(row.billableHours).toFixed(1)}h`,
      },
      {
        key: "submittedAt",
        header: "Submitted",
        cell: (row) =>
          row.submittedAt ? (
            <span className="text-dense text-muted-foreground">
              {format(parseISO(row.submittedAt), "MMM d, yyyy")}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        sortable: true,
        sortValue: (row) => row.submittedAt ?? "",
      },
      {
        key: "status",
        header: "Status",
        cell: (row) => (
          <Badge
            className={cn(
              "text-micro border px-1.5 py-0",
              PERIOD_STATUS_BADGE[row.status],
            )}
          >
            {PERIOD_STATUS_LABEL[row.status]}
          </Badge>
        ),
      },
    ],
    [],
  );

  const toolbar =
    canManage && selection.size > 0 && tab === "SUBMITTED" ? (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {selection.size} selected
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1.5"
          onClick={onBulkApprove}
          disabled={isBulkPending}
        >
          <CheckCircle className="h-3 w-3 text-status-success-ink" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1.5 border-destructive/40 text-destructive"
          onClick={onBulkReject}
          disabled={isBulkPending}
        >
          <XCircle className="h-3 w-3" />
          Reject
        </Button>
      </div>
    ) : undefined;

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load approvals"
        description="Something went wrong loading timesheet approvals."
        onRetry={onRetry}
        className="min-h-[30dvh]"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <DataTable
        className="flex-1 min-h-0"
        data={periods}
        columns={columns}
        getRowKey={(row) => row.id}
        onRowClick={onRowClick}
        selection={
          canManage && tab === "SUBMITTED"
            ? { selected: selection, onChange: onSelectionChange }
            : undefined
        }
        isLoading={isLoading}
        toolbar={toolbar}
        minWidth="700px"
        pagination={{ pageSize: PAGE_SIZE }}
        emptyState={
          <EmptyState
            illustrationPreset="approval"
            title="No timesheets"
            description={filtersActive ? undefined : TAB_EMPTY[tab]}
            filtersActive={filtersActive}
            onClearFilters={onClearFilters}
            compact
          />
        }
      />
      {hasMore && (
        <div className="flex justify-center pb-2">
          <LoadingButton
            variant="outline"
            size="sm"
            isPending={isFetchingMore}
            onClick={onLoadMore}
          >
            Load more
          </LoadingButton>
        </div>
      )}
    </div>
  );
}

export interface ApprovalsTabPanelProps {
  status: ApprovalTab;
  memberFilter: string;
  dateFrom: string;
  dateTo: string;
  canAccess: boolean;
  canManage: boolean;
  selection: Set<string | number>;
  onSelectionChange: (sel: Set<string | number>) => void;
  onRowClick: (period: TimesheetPeriod) => void;
  onBulkApprove: () => void;
  onBulkReject: () => void;
  isBulkPending: boolean;
  onClearFilters: () => void;
}

export function ApprovalsTabPanel({
  status,
  memberFilter,
  dateFrom,
  dateTo,
  canAccess,
  canManage,
  selection,
  onSelectionChange,
  onRowClick,
  onBulkApprove,
  onBulkReject,
  isBulkPending,
  onClearFilters,
}: ApprovalsTabPanelProps) {
  const {
    data,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useApprovals(
    {
      status,
      userId: memberFilter !== "all" ? memberFilter : undefined,
      startDate: dateFrom || undefined,
      endDate: dateTo || undefined,
      limit: PAGE_SIZE,
    },
    canAccess,
  );

  const periods = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  const filtersActive = memberFilter !== "all" || !!dateFrom || !!dateTo;

  return (
    <Card>
      <CardContent className="p-0">
        <ApprovalsTable
          periods={periods}
          isLoading={isLoading}
          isError={isError}
          onRetry={handleRetry}
          onRowClick={onRowClick}
          selection={selection}
          onSelectionChange={onSelectionChange}
          canManage={canManage}
          onBulkApprove={onBulkApprove}
          onBulkReject={onBulkReject}
          tab={status}
          isBulkPending={isBulkPending}
          hasMore={hasNextPage}
          isFetchingMore={isFetchingNextPage}
          onLoadMore={handleLoadMore}
          filtersActive={filtersActive}
          onClearFilters={onClearFilters}
        />
      </CardContent>
    </Card>
  );
}
