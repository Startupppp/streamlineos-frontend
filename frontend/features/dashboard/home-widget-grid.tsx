"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useMotionVariants } from "@/lib/motion-variants";
import { WidgetSkeleton } from "@/components/dashboard/widget-skeleton";
import { HomeSectionBoundary } from "./home-section-boundary";

const LeaveBalanceWidget = dynamic(
  () =>
    import("@/features/dashboard/hr-widgets").then((m) => ({
      default: m.LeaveBalanceWidget,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} /> },
);
const MyAttendanceWidget = dynamic(
  () =>
    import("@/features/dashboard/my-attendance-widget").then((m) => ({
      default: m.MyAttendanceWidget,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} /> },
);
const PayrollWidget = dynamic(
  () =>
    import("@/features/dashboard/payroll-widget").then((m) => ({
      default: m.PayrollWidget,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} /> },
);
const ExpensesWidget = dynamic(
  () =>
    import("@/features/dashboard/expenses-widget").then((m) => ({
      default: m.ExpensesWidget,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} /> },
);
const RecruitmentWidget = dynamic(
  () =>
    import("@/features/dashboard/recruitment-widget").then((m) => ({
      default: m.RecruitmentWidget,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} /> },
);
const AlertsWidget = dynamic(
  () =>
    import("@/features/dashboard/alerts-widget").then((m) => ({
      default: m.AlertsWidget,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} /> },
);
const MyTasksWidget = dynamic(
  () =>
    import("@/components/dashboard/my-tasks-widget").then((m) => ({
      default: m.MyTasksWidget,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} /> },
);
const TimesheetWidget = dynamic(
  () =>
    import("@/components/dashboard/timesheet-widget").then((m) => ({
      default: m.TimesheetWidget,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} /> },
);
const AnnouncementsWidget = dynamic(
  () =>
    import("@/components/dashboard/announcements-widget").then((m) => ({
      default: m.AnnouncementsWidget,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} /> },
);
const UpcomingEventsWidget = dynamic(
  () =>
    import("@/components/dashboard/upcoming-events-widget").then((m) => ({
      default: m.UpcomingEventsWidget,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} /> },
);
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
  const { fadeUp } = useMotionVariants();
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
