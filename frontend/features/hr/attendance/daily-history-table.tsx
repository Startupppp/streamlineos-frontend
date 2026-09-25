"use client";

import { memo, useCallback, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useCursorPager } from "@/components/ui/table-pagination";
import { PAGE_BODY_EMPTY_CLASS } from "@/components/ui/content-fill-panel";
import { useHrAttendanceHistory } from "@/hooks/api/hr";
import { toast } from "sonner";
import { ClipboardList } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DownloadIcon } from "@animateicons/react/lucide";
import { AttendanceEmailDialog } from "./attendance-email-dialog";
import { formatDuration } from "./attendance-utils";
import { cn } from "@/lib/utils";
import type { AttendanceLog } from "@/types/hr";

const statusBadgeClasses: Record<string, string> = {
  PRESENT: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  ABSENT: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  LATE: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  HALF_DAY: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  WFH: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  ON_BREAK: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  CHECKED_OUT: "bg-muted text-muted-foreground border-border",
  MISSING_CHECKOUT: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
};

function getStatusLabel(statusKey: string): string {
  if (statusKey === "CHECKED_OUT") return "Checked Out";
  if (statusKey === "ON_BREAK") return "On Break";
  if (statusKey === "HALF_DAY") return "Half Day";
  if (statusKey === "MISSING_CHECKOUT") return "Missing Checkout";
  return statusKey.charAt(0) + statusKey.slice(1).toLowerCase();
}

const columns: DataTableColumn<AttendanceLog>[] = [
  {
    key: "date",
    header: "Date",
    cell: (log) => (
      <span className="text-sm font-medium">
        {format(new Date(log.date), "EEE, MMM dd")}
      </span>
    ),
  },
  {
    key: "checkIn",
    header: "Check In",
    headerClassName: "hidden md:table-cell",
    className: "hidden md:table-cell font-mono text-sm tabular-nums text-muted-foreground",
    cell: (log) => (
      <span className="hidden font-mono text-sm tabular-nums text-muted-foreground md:inline">
        {log.checkIn ? format(new Date(log.checkIn), "hh:mm a") : "--"}
      </span>
    ),
  },
  {
    key: "checkOut",
    header: "Check Out",
    headerClassName: "hidden md:table-cell",
    className: "hidden md:table-cell font-mono text-sm tabular-nums text-muted-foreground",
    cell: (log) => (
      <span className="hidden font-mono text-sm tabular-nums text-muted-foreground md:inline">
        {log.checkOut ? format(new Date(log.checkOut), "hh:mm a") : "--"}
      </span>
    ),
  },
  {
    key: "totalHours",
    header: "Total Hours",
    headerClassName: "hidden md:table-cell",
    className: "hidden md:table-cell font-mono text-sm tabular-nums",
    cell: (log) => (
      <span className="hidden font-mono text-sm tabular-nums md:inline">
        {log.workHours ? formatDuration(log.workHours) : "--"}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (log) => {
      const recordedStatus = log.status?.toUpperCase();
      const isClassifiedStatus =
        recordedStatus === "ABSENT" ||
        recordedStatus === "HALF_DAY" ||
        recordedStatus === "LATE" ||
        recordedStatus === "WFH";
      const statusKey =
        isClassifiedStatus && recordedStatus
          ? recordedStatus
          : !log.checkOut &&
              log.date < format(new Date(), "yyyy-MM-dd") &&
              (log.status === "PRESENT" || !log.status)
            ? "MISSING_CHECKOUT"
            : log.checkOut && log.status !== "ON_BREAK"
              ? "CHECKED_OUT"
              : log.status || "PRESENT";
      const badgeClass = statusBadgeClasses[statusKey] ?? statusBadgeClasses.PRESENT;
      return (
        <Badge
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-micro font-semibold",
            badgeClass,
          )}
        >
          {getStatusLabel(statusKey)}
        </Badge>
      );
    },
  },
];

async function handleDownloadReport(logs: AttendanceLog[]) {
  try {
    const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
    const rows = logs.map((log) => ({
      date: log.date ? format(new Date(log.date), "yyyy-MM-dd") : "",
      checkIn: log.checkIn ? format(new Date(log.checkIn), "hh:mm a") : "",
      checkOut: log.checkOut ? format(new Date(log.checkOut), "hh:mm a") : "",
      totalHours: log.workHours || "",
      status: log.status || "PRESENT",
    }));
    await downloadXlsx(
      `attendance-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`,
      [
        {
          name: "Attendance",
          columns: [
            { header: "Date", key: "date", width: 15 },
            { header: "Check In", key: "checkIn", width: 15 },
            { header: "Check Out", key: "checkOut", width: 15 },
            { header: "Total Hours", key: "totalHours", width: 15 },
            { header: "Status", key: "status", width: 15 },
          ],
          rows,
        },
      ],
    );
    toast.success("Report downloaded");
  } catch {
    toast.error("Failed to generate report");
  }
}

function getRowKey(log: AttendanceLog) {
  return log.id;
}

function getRowClassName(_: AttendanceLog, index: number) {
  return cn(
    "hover:bg-muted/30 transition-colors duration-200",
    index % 2 === 0 ? "bg-background" : "bg-muted/20",
  );
}

export const DailyHistoryTable = memo(function DailyHistoryTable({
  fill = false,
  chrome = true,
}: {
  fill?: boolean;
  chrome?: boolean;
}) {
  const [pageSize, setPageSize] = useState(20);
  /**
   * The page-overshoot correction this component used to run — snapping
   * `page` back to `totalPages` whenever a page-size change or a deleted row
   * left the reader past the end — is gone because the state it corrected can
   * no longer exist. A keyset pager holds cursors, not a page index, so there
   * is no number to overshoot; changing the page size rewinds to the head via
   * `resetKey`, which is the same outcome the correction produced, one render
   * earlier and without a query for a page that isn't there.
   */
  const pager = useCursorPager(String(pageSize));
  const { data, error, isLoading, refetch } = useHrAttendanceHistory(
    pager.cursor,
    pageSize,
  );
  const logs = data?.data ?? [];
  const hasMore = data?.pagination.hasMore ?? false;
  const nextCursor = data?.pagination.nextCursor ?? null;

  const handleNextPage = useCallback(() => {
    pager.goNext(nextCursor);
  }, [pager, nextCursor]);

  const handlePageSizeChange = useCallback((nextPageSize: number) => {
    setPageSize(nextPageSize);
  }, []);

  const pagination = {
    mode: "cursor",
    pageSize,
    hasMore,
    hasPrevious: pager.hasPrevious,
    onNext: handleNextPage,
    onPrevious: pager.goPrevious,
    onPageSizeChange: handlePageSizeChange,
    pageSizeOptions: [10, 20, 50] as const,
  } as const;

  // Reads /me/attendance/history (self:attendance): a caller without it must
  // be told so, not "No attendance records" (FE-47).
  const pageState = usePageState({
    permission: "self:attendance",
    isLoading,
    isError: Boolean(error),
    error,
  });
  const isInterrupted =
    pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading";

  function handleRetry() {
    void refetch();
  }

  function handleDownloadClick() {
    void handleDownloadReport(logs);
  }

  const emptyState = (
    <EmptyState
      illustrationPreset="calendar"
      title="No attendance records"
      description="Your attendance history will appear here."
      className={cn(PAGE_BODY_EMPTY_CLASS, !fill && "py-10")}
    />
  );

  if (!chrome) {
    if (isInterrupted) {
      return (
        <PageState resolution={pageState} loading={null} onRetry={handleRetry}>
          {null}
        </PageState>
      );
    }

    if (!isLoading && logs.length === 0) {
      return (
        <div className="flex min-h-0 flex-1 flex-col" aria-live="polite">
          {emptyState}
        </div>
      );
    }

    return (
      <div className="flex min-h-0 flex-1 flex-col" aria-live="polite">
        <DataTable
          data={logs}
          columns={columns}
          getRowKey={getRowKey}
          rowClassName={getRowClassName}
          isLoading={isLoading}
          minWidth="640px"
          className="min-h-0 flex-1"
          emptyState={emptyState}
          pagination={pagination}
        />
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "overflow-hidden",
        fill && "flex min-h-0 flex-1 flex-col",
      )}
    >
      <CardHeader className="shrink-0 border-b px-4 pb-3 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            Daily History
          </CardTitle>
          <div className="flex items-center gap-2">
            <AttendanceEmailDialog />
            <AnimatedIconButton
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              disabled={logs.length === 0}
              onClick={handleDownloadClick}
              icon={DownloadIcon}
              iconSize={14}
              iconClassName="mr-1.5"
            >
              Download page
            </AnimatedIconButton>
          </div>
        </div>
      </CardHeader>
      <CardContent
        className={cn("p-0", fill && "min-h-0 flex-1 overflow-auto")}
        aria-live="polite"
      >
        {isInterrupted ? (
          <PageState resolution={pageState} loading={null} onRetry={handleRetry} compact>
            {null}
          </PageState>
        ) : (
          <DataTable
            data={logs}
            columns={columns}
            getRowKey={getRowKey}
            rowClassName={getRowClassName}
            isLoading={isLoading}
            minWidth="640px"
            emptyState={emptyState}
            pagination={pagination}
          />
        )}
      </CardContent>
    </Card>
  );
});
