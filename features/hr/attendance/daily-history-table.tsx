"use client";

import { memo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useHrAttendanceStatus } from "@/lib/api/hooks/hr";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { AttendanceLogRow } from "./attendance-log-row";

export const DailyHistoryTable = memo(function DailyHistoryTable() {
  const { data, isLoading } = useHrAttendanceStatus();

  const logs = data?.logs || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Daily History</CardTitle>
          <button
            className="text-sm text-gold hover:text-gold/80 font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            disabled={logs.length === 0}
            onClick={async () => {
              try {
                const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
                const rows = logs.map((log) => ({
                  date: log.date ? format(new Date(log.date), "yyyy-MM-dd") : "",
                  checkIn: log.checkIn ? format(new Date(log.checkIn), "hh:mm a") : "",
                  checkOut: log.checkOut ? format(new Date(log.checkOut), "hh:mm a") : "",
                  totalHours: log.workHours || "",
                  status: log.status || "PRESENT",
                }));
                await downloadXlsx(`attendance-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`, [
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
                ]);
                toast.success("Report downloaded");
              } catch {
                toast.error("Failed to generate report");
              }
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Download Report
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="border border-border rounded-md overflow-hidden">
        <ScrollArea className="w-full" type="auto" role="region" aria-label="Attendance records table">
          <div className="min-w-max">
          <Table className="border-collapse">
            <caption className="sr-only">Recent attendance history</caption>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold border border-border px-4 py-2.5 text-foreground">Date</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold border border-border px-4 py-2.5 text-foreground">Check In</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold border border-border px-4 py-2.5 text-foreground">Check Out</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold border border-border px-4 py-2.5 text-foreground">Total Hours</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold border border-border px-4 py-2.5 text-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground border border-border">
                    No attendance records found.
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
