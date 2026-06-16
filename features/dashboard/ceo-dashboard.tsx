"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion-variants";
import { ExecutiveKpiWidget } from "@/components/dashboard/executive-kpi-widget";
import { BusinessPulseWidget } from "@/components/dashboard/project-health-widget";
import { UpcomingEventsWidget } from "@/components/dashboard/upcoming-events-widget";
import { AnnouncementsWidget } from "@/components/dashboard/announcements-widget";
import { WidgetSkeleton } from "@/components/dashboard/widget-skeleton";
import {
  LeavesTodayWidget,
  TeamAttendanceWidget,
  PendingApprovalsWidget,
  BirthdaysWidget,
  LeaveBalanceWidget,
  UpcomingHolidaysWidget,
} from "@/features/dashboard/hr-widgets";
import { PublicDocumentsCard } from "@/features/dashboard/public-documents-card";

export function CeoDashboard() {
  return (
    <>
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <Suspense fallback={<WidgetSkeleton rows={2} />}>
          <ExecutiveKpiWidget />
        </Suspense>
      </motion.div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
      >
        <Suspense fallback={<WidgetSkeleton rows={3} />}>
          <AnnouncementsWidget />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton rows={2} />}>
          <BusinessPulseWidget />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton rows={3} />}>
          <UpcomingEventsWidget />
        </Suspense>
      </motion.div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
      >
        <LeavesTodayWidget />
        <TeamAttendanceWidget />
        <PendingApprovalsWidget />
      </motion.div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
      >
        <BirthdaysWidget />
        <LeaveBalanceWidget />
        <UpcomingHolidaysWidget />
      </motion.div>

      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <PublicDocumentsCard />
      </motion.div>
    </>
  );
}
