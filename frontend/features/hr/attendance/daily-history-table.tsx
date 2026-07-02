"use client";

import { memo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { useHrAttendanceStatus } from "@/hooks/api/hr";
import { toast } from "sonner";
import { Download, ClipboardList } from "lucide-react";
import { AttendanceLogRow } from "./attendance-log-row";
import { AttendanceEmailDialog } from "./attendance-email-dialog";
import type { AttendanceLog } from "@/types/hr";

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

export const DailyHistoryTable = memo(function DailyHistoryTable() {
  const { data, isLoading } = useHrAttendanceStatus();

  const logs = data?.logs || [];

  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <CardContent className="p-5">
          <div className="space-y-2">
            <Skeleton className="h-9 w-full rounded-md" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
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
              onClick={() => handleDownloadReport(logs)}
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 px-5 pb-5">
        <div className="rounded-lg border border-border overflow-hidden">
          <ScrollArea
            className="w-full"
            type="auto"
            role="region"
            aria-label="Attendance records table"
          >
            <div className="min-w-max">
              <Table className="border-collapse">
                <caption className="sr-only">Recent attendance history</caption>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border px-4 py-2.5">
                      Date
                    </TableHead>
                    <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border px-4 py-2.5">
                      Check In
                    </TableHead>
                    <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border px-4 py-2.5">
                      Check Out
                    </TableHead>
                    <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border px-4 py-2.5">
                      Total Hours
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border px-4 py-2.5">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-0 border-0">
                        <EmptyState
                          illustration={
                            <ClipboardList className="h-8 w-8 text-muted-foreground" />
                          }
                          title="No attendance records"
                          description="Your attendance history will appear here."
                          compact
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log, idx) => (
                      <AttendanceLogRow key={log.id} log={log} index={idx} />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
});
