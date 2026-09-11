"use client";

import { useMemo, useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { APPROVALS_PAGE_SIZE, useApprovals } from "@/hooks/api/timesheets-core/approvals";
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

const PAGE_SIZE = APPROVALS_PAGE_SIZE;

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
  page: number;
  total: number;
  onPageChange: (page: number) => void;
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
  page,
  total,
  onPageChange,
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
      },
      {
        key: "totalHours",
        header: "Hours",
        headerClassName: "text-right",
        className: "text-right tabular-nums",
        cell: (row) => `${parseFloat(row.totalHours).toFixed(1)}h`,
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
            <span className="text-muted-foreground/30">—</span>
          ),
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
      pagination={{
        mode: "server",
        page,
        pageSize: PAGE_SIZE,
        total,
        onPageChange,
      }}
      emptyState={
        <EmptyState
          illustrationPreset="approval"
          title="No timesheets"
          description={TAB_EMPTY[tab]}
          compact
        />
      }
    />
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
}: ApprovalsTabPanelProps) {
  const [page, setPage] = useState(1);

  /**
   * Reset to page 1 when the filters change. Done during render rather than in
   * an effect: an effect renders page 4 of the old filter first, fires a
   * request for it, and only then corrects itself — two renders and a wasted
   * round trip on every filter keystroke.
   */
  const filterKey = `${status}|${memberFilter}|${dateFrom}|${dateTo}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useApprovals(
    {
      status,
      userId: memberFilter !== "all" ? memberFilter : undefined,
      startDate: dateFrom || undefined,
      endDate: dateTo || undefined,
      page,
      limit: PAGE_SIZE,
    },
    canAccess,
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);
  const handlePageChange = useCallback((p: number) => setPage(p), []);

  return (
    <Card>
      <CardContent className="p-0">
        <ApprovalsTable
          periods={data?.data ?? []}
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
          page={page}
          total={data?.pagination.total ?? 0}
          onPageChange={handlePageChange}
        />
      </CardContent>
    </Card>
  );
}
