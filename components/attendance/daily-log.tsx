"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useHrAttendanceStatus } from "../../lib/hooks/trpc-hooks";
import { format } from "date-fns";
import { Clock, Coffee, AlertTriangle } from "lucide-react";
import { DailyLogSkeleton } from "../ui/attendance-skeleton";

export function DailyLog() {
  const { data, isLoading } = useHrAttendanceStatus();

  if (isLoading) {
    return <DailyLogSkeleton />;
  }

  const log = data?.todayLog;
  const breaks = (log?.breaks as { start: string; end?: string }[]) || [];

  // Calculate durations for display
  const workDuration = log?.workHours || "0.00";
  const breakDuration = log?.breakHours || "0.00";
  const overtimeDuration = log?.isOvertime
    ? (Number(workDuration) - 9).toFixed(2)
    : "0.00";

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Work Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              {workDuration}{" "}
              <span className="text-sm font-normal text-muted-foreground">hrs</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Break Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Coffee className="w-5 h-5 text-orange-400" />
              {breakDuration}{" "}
              <span className="text-sm font-normal text-muted-foreground">hrs</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overtime Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              {overtimeDuration}{" "}
              <span className="text-sm font-normal text-muted-foreground">hrs</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Timeline / Logs */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-lg">
            Timeline Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Visual Timeline Bar (Simulated) */}
          <div className="relative h-4 bg-muted rounded-full mb-8 overflow-hidden">
            {/* Just a progress bar for now representing current time progress in a 12h shift? */}
            {/* This is complex to do accurately without proper start/end scales. omitting dependent on complexity pref */}
          </div>

          <div className="space-y-4">
            {!log ? (
              <div className="text-muted-foreground text-center py-4">
                Not clocked in today.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-md border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-foreground font-medium">Clock In</span>
                  </div>
                  <span className="text-muted-foreground font-mono">
                    {format(new Date(log.checkIn!), "hh:mm:ss a")}
                  </span>
                </div>

                {breaks.map((b, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-muted/20 rounded-md border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <span className="text-foreground font-medium">
                          Break Start
                        </span>
                      </div>
                      <span className="text-muted-foreground font-mono">
                        {format(new Date(b.start), "hh:mm:ss a")}
                      </span>
                    </div>
                    {b.end && (
                      <div className="flex items-center justify-between p-3 bg-muted/20 rounded-md border border-border">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                          <span className="text-foreground font-medium">
                            Break End
                          </span>
                        </div>
                        <span className="text-muted-foreground font-mono">
                          {format(new Date(b.end), "hh:mm:ss a")}
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                {log.checkOut && (
                  <div className="flex items-center justify-between p-3 bg-muted/20 rounded-md border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-foreground font-medium">Clock Out</span>
                    </div>
                    <span className="text-muted-foreground font-mono">
                      {format(new Date(log.checkOut), "hh:mm:ss a")}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
