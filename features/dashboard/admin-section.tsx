"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion-variants";
import { ExecutiveKpiWidget } from "@/components/dashboard/widgets/executive-kpi-widget";
import { ProjectHealthWidget } from "@/components/dashboard/widgets/project-health-widget";
import { AnnouncementsWidget } from "@/components/dashboard/widgets/announcements-widget";
import { UpcomingEventsWidget } from "@/components/dashboard/widgets/upcoming-events-widget";
import { QuickActionsWidget } from "@/components/dashboard/widgets/quick-actions-widget";
import { WidgetSkeleton } from "@/components/dashboard/widgets/widget-skeleton";
import {
  LeaveBalanceWidget,
  UpcomingHolidaysWidget,
  LeavesTodayWidget,
  BirthdaysWidget,
  PendingRequestsWidget,
  TeamAttendanceWidget,
  PendingApprovalsWidget,
} from "@/features/dashboard/hr-widgets";
import { PublicDocumentsCard } from "@/features/dashboard/public-documents-card";
import { LeaveTodayCard } from "@/features/dashboard/leave-today-card";
import { UpcomingLeavesCard } from "@/features/dashboard/upcoming-leaves-card";
import { BirthdaysCard } from "@/features/dashboard/birthdays-card";
import { PendingApprovalsCard } from "@/features/dashboard/pending-approvals-card";

export function AdminSection() {
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
        className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
      >
        <Suspense fallback={<WidgetSkeleton rows={3} />}>
          <AnnouncementsWidget />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton rows={2} />}>
          <ProjectHealthWidget />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton rows={3} />}>
          <UpcomingEventsWidget />
        </Suspense>
      </motion.div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      >
        <LeaveTodayCard isAdmin={true} />
        <UpcomingLeavesCard isAdmin={true} />
        <BirthdaysCard />
        <PendingApprovalsCard />
      </motion.div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      >
        <LeaveBalanceWidget />
        <UpcomingHolidaysWidget />
        <LeavesTodayWidget />
        <BirthdaysWidget />
      </motion.div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="grid gap-4 grid-cols-1 sm:grid-cols-3"
      >
        <PendingRequestsWidget />
        <TeamAttendanceWidget />
        <PendingApprovalsWidget />
      </motion.div>

      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <PublicDocumentsCard />
      </motion.div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
      >
        <Suspense fallback={<WidgetSkeleton rows={3} />}>
          <QuickActionsWidget />
        </Suspense>
      </motion.div>
    </>
  );
}
