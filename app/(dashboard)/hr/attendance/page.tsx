"use client";

import { ClockInWidget } from "@/components/attendance/clock-in-widget";
import { DailyLog } from "@/components/attendance/daily-log";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function AttendancePage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Attendance</h2>
          <p className="text-muted-foreground">
            Track your work hours, breaks, and daily logs.
          </p>
        </div>
        <div>
           {/* Widget in header area for quick access */}
           <ClockInWidget />
        </div>
      </div>
      <Separator />

      <div className="space-y-4">
          <DailyLog />
      </div>
    </div>
  );
}
