"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion-variants";
import { WidgetSkeleton } from "@/components/dashboard/widget-skeleton";
import { LeaveBalanceWidget } from "@/features/dashboard/hr-widgets";
import { MyAttendanceWidget } from "@/features/dashboard/my-attendance-widget";
import { PayrollWidget } from "@/features/dashboard/payroll-widget";
import { ExpensesWidget } from "@/features/dashboard/expenses-widget";
import { RecruitmentWidget } from "@/features/dashboard/recruitment-widget";
import { AlertsWidget } from "@/features/dashboard/alerts-widget";
import { MyTasksWidget } from "@/components/dashboard/my-tasks-widget";
import { TimesheetWidget } from "@/components/dashboard/timesheet-widget";
import { AnnouncementsWidget } from "@/components/dashboard/announcements-widget";
import { UpcomingEventsWidget } from "@/components/dashboard/upcoming-events-widget";
import { HomeSectionBoundary } from "./home-section-boundary";

const BusinessPulseWidget = dynamic(
  () =>
    import("@/components/dashboard/project-health-widget").then((m) => ({
      default: m.BusinessPulseWidget,
    })),
  { loading: () => <WidgetSkeleton rows={2} /> },
);

export interface HomeWidgetGridProps {
  projectsEnabled: boolean;
  hrEnabled: boolean;
  canViewExecutive: boolean;
  canSelfAttendance: boolean;
}

export function HomeWidgetGrid({
  projectsEnabled,
  hrEnabled,
  canViewExecutive,
  canSelfAttendance,
}: HomeWidgetGridProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {projectsEnabled ? (
        <HomeSectionBoundary sectionLabel="My tasks">
          <MyTasksWidget />
        </HomeSectionBoundary>
      ) : null}
      {projectsEnabled ? (
        <HomeSectionBoundary sectionLabel="Timesheet">
          <TimesheetWidget />
        </HomeSectionBoundary>
      ) : null}
      {hrEnabled ? (
        <HomeSectionBoundary sectionLabel="Leave balance">
          <LeaveBalanceWidget />
        </HomeSectionBoundary>
      ) : null}
      <HomeSectionBoundary sectionLabel="Alerts">
        <AlertsWidget />
      </HomeSectionBoundary>
      <HomeSectionBoundary sectionLabel="Announcements">
        <AnnouncementsWidget />
      </HomeSectionBoundary>
      <HomeSectionBoundary sectionLabel="Upcoming events">
        <UpcomingEventsWidget />
      </HomeSectionBoundary>
      {canViewExecutive ? (
        <HomeSectionBoundary sectionLabel="Business pulse">
          <BusinessPulseWidget />
        </HomeSectionBoundary>
      ) : null}
      {hrEnabled && canSelfAttendance ? (
        <HomeSectionBoundary sectionLabel="My attendance">
          <MyAttendanceWidget />
        </HomeSectionBoundary>
      ) : null}
      <HomeSectionBoundary sectionLabel="Payroll">
        <PayrollWidget />
      </HomeSectionBoundary>
      <HomeSectionBoundary sectionLabel="Expenses">
        <ExpensesWidget />
      </HomeSectionBoundary>
      <HomeSectionBoundary sectionLabel="Recruitment">
        <RecruitmentWidget />
      </HomeSectionBoundary>
    </motion.div>
  );
}
