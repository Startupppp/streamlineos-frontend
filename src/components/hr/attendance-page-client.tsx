"use client";

import { AttendanceTracker } from "@/components/hr/attendance-tracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { useHrAttendanceStatus } from "@/lib/hooks/trpc-hooks";
import { type AttendanceStatus, type AttendanceLog } from "@/types/api";
import { AttendancePageSkeleton } from "@/components/ui/attendance-skeleton";

export function AttendancePageClient() {
  const { data, isLoading } = useHrAttendanceStatus();

  if (isLoading) {
    return <AttendancePageSkeleton />;
  }

  if (!data) {
    return <div className="p-8">No data available</div>;
  }

  const { status, logs, todayLog } = data;

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold text-primary">Attendance</h1>
      
      <div className="grid gap-8 md:grid-cols-2">
        <div>
            <AttendanceTracker initialStatus={status as AttendanceStatus} todayLog={todayLog} />
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Recent Logs</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {logs.map((log: AttendanceLog) => (
                        <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                                <div className="font-semibold">{format(new Date(log.date), "EEE, MMM dd")}</div>
                                <div className="text-sm text-muted-foreground">
                                    {log.checkIn ? format(new Date(log.checkIn), "hh:mm a") : "--"} - 
                                    {log.checkOut ? format(new Date(log.checkOut), "hh:mm a") : " Active"}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`font-bold ${log.isOvertime ? "text-yellow-600" : "text-primary"}`}>
                                    {log.workHours || "0"} hrs
                                </div>
                                <div className="text-xs text-muted-foreground capitalize">{(log.status || "Unknown").toLowerCase()}</div>
                            </div>
                        </div>
                    ))}
                    {logs.length === 0 && <div className="text-center text-muted-foreground">No records found.</div>}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
