"use client";

import { memo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useHrAttendanceStatus } from "@/hooks/api/hr";
import { toast } from "sonner";
import { Download, ClipboardList } from "lucide-react";
import { AttendanceEmailDialog } from "./attendance-email-dialog";
import { formatDuration } from "./attendance-utils";
import { cn } from "@/lib/utils";
import type { AttendanceLog } from "@/types/hr";

const statusBadgeClasses: Record<string, string> = {
  PRESENT: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  ABSENT: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  LATE: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  HALF_DAY: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
  WFH: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800",
  ON_BREAK: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  CHECKED_OUT: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-400 dark:border-slate-800",
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
      <span className="font-medium text-sm">
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
      <span className="hidden md:inline font-mono text-sm tabular-nums text-muted-foreground">
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
      <span className="hidden md:inline font-mono text-sm tabular-nums text-muted-foreground">
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
      <span className="hidden md:inline font-mono text-sm tabular-nums">
        {log.workHours ? formatDuration(log.workHours) : "--"}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (log) => {
      const statusKey = log.status || "PRESENT";
      const badgeClass = statusBadgeClasses[statusKey] ?? statusBadgeClasses.PRESENT;
      return (
        <Badge
          className={cn(
            "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
            badgeClass
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

function getRowClassName(_log: AttendanceLog, index: number) {
  return cn(
    "hover:bg-muted/30 transition-colors duration-200",
    index % 2 === 0 ? "bg-background" : "bg-muted/20"
  );
}

export const DailyHistoryTable = memo(function DailyHistoryTable() {
  const { data, isLoading } = useHrAttendanceStatus();

  const logs = data?.logs || [];

  function handleDownloadClick() {
    void handleDownloadReport(logs);
  }

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <CardHeader className="pb-3 pt-5 px-5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center shrink-0">
              <ClipboardList className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
            </div>
            Daily History
          </CardTitle>
          <div className="flex items-center gap-2">
            <AttendanceEmailDialog />
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              disabled={logs.length === 0}
              onClick={handleDownloadClick}
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 px-5 pb-5">
        <DataTable
          data={logs}
          columns={columns}
          getRowKey={getRowKey}
          rowClassName={getRowClassName}
          isLoading={isLoading}
          minWidth="640px"
          emptyState={
            <EmptyState
              illustration={
                <ClipboardList className="h-8 w-8 text-muted-foreground" />
              }
              title="No attendance records"
              description="Your attendance history will appear here."
              compact
            />
          }
        />
      </CardContent>
    </Card>
  );
});
