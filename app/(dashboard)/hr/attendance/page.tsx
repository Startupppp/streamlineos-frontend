"use client";

import { ClockInWidget } from "@/components/attendance/clock-in-widget";
import { DailyLog } from "@/components/attendance/daily-log";
import { RequestWfhDialog } from "@/components/hr/request-wfh-dialog";
import { MyWfhRequests, PendingWfhApprovals } from "@/components/hr/wfh-requests-list";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "next-auth/react";

export default function AttendancePage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "OWNER" || session?.user?.role === "ADMIN";

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Attendance</h2>
          <p className="text-muted-foreground">
            Track your work hours, breaks, and work from home requests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RequestWfhDialog />
          <ClockInWidget />
        </div>
      </div>
      <Separator />

      <Tabs defaultValue="daily-log" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily-log">Daily Log</TabsTrigger>
          <TabsTrigger value="wfh">Work From Home</TabsTrigger>
        </TabsList>

        <TabsContent value="daily-log" className="space-y-4">
          <DailyLog />
        </TabsContent>

        <TabsContent value="wfh" className="space-y-4">
          {isAdmin && <PendingWfhApprovals />}
          <MyWfhRequests />
        </TabsContent>
      </Tabs>
    </div>
  );
}
