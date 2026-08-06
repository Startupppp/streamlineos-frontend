"use client";

import { memo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PAGE_BODY_EMPTY_CLASS } from "@/components/ui/content-fill-panel";
import { useHrAttendanceStatus } from "@/hooks/api/hr";
import { toast } from "sonner";
import { ClipboardList } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DownloadIcon } from "@animateicons/react/lucide";
import { AttendanceEmailDialog } from "./attendance-email-dialog";
import { formatDuration } from "./attendance-utils";
import { cn } from "@/lib/utils";
import type { AttendanceLog } from "@/types/hr";

const statusBadgeClasses: Record<string, string> = {
  PRESENT: "bg-green-100 text-green-800 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30",
  ABSENT: "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  LATE: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  HALF_DAY: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  WFH: "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30",
  ON_BREAK: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  CHECKED_OUT: "bg-muted text-muted-foreground border-border",
};

function getStatusLabel(statusKey: string): string {
  if (statusKey === "CHECKED_OUT") return "Checked Out";
  if (statusKey === "ON_BREAK") return "On Break";
  if (statusKey === "HALF_DAY") return "Half Day";
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
      const statusKey =
        log.checkOut && log.status !== "ON_BREAK"
          ? "CHECKED_OUT"
          : log.status || "PRESENT";
      const badgeClass = statusBadgeClasses[statusKey] ?? statusBadgeClasses.PRESENT;
      return (
        <Badge
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
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
  const { data, isLoading } = useHrAttendanceStatus();
  const logs = data?.logs || [];

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
              Download
            </AnimatedIconButton>
          </div>
        </div>
      </CardHeader>
      <CardContent
        className={cn("p-0", fill && "min-h-0 flex-1 overflow-auto")}
        aria-live="polite"
      >
        <DataTable
          data={logs}
          columns={columns}
          getRowKey={getRowKey}
          rowClassName={getRowClassName}
          isLoading={isLoading}
          minWidth="640px"
          emptyState={emptyState}
        />
      </CardContent>
    </Card>
  );
});
