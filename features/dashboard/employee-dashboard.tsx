"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion-variants";
import { MyTasksWidget } from "@/components/dashboard/my-tasks-widget";
import { TimesheetWidget } from "@/components/dashboard/timesheet-widget";
import { LeaveBalanceWidget } from "@/components/dashboard/leave-balance-widget";
import { AnnouncementsWidget } from "@/components/dashboard/announcements-widget";
import { UpcomingEventsWidget } from "@/components/dashboard/upcoming-events-widget";
import { WidgetSkeleton } from "@/components/dashboard/widget-skeleton";

export function EmployeeDashboard() {
  return (
    <>
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
      >
        <Suspense fallback={<WidgetSkeleton rows={4} />}>
          <MyTasksWidget />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton rows={2} />}>
          <TimesheetWidget />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton rows={3} />}>
          <LeaveBalanceWidget />
        </Suspense>
      </motion.div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="grid gap-3 grid-cols-1 md:grid-cols-2"
      >
        <Suspense fallback={<WidgetSkeleton rows={3} />}>
          <UpcomingEventsWidget />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton rows={3} />}>
          <AnnouncementsWidget />
        </Suspense>
      </motion.div>
    </>
  );
}
