"use client";

import { useMemo, Fragment, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useMotionVariants } from "@/lib/motion-variants";
import { WidgetSkeleton } from "@/components/dashboard/widget-skeleton";
import { HomeSectionBoundary } from "./home-section-boundary";
import { HomeSectionHeader } from "./home-section-header";
import {
  HomeCustomisationBar,
  type WidgetOption,
} from "./home-customisation-bar";
import {
  useHomeCustomisation,
  applyWidgetOrder,
} from "./use-home-customisation";

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
const TodayActivitiesWidget = dynamic(
  () =>
    import("@/components/dashboard/today-activities-widget").then((m) => ({
      default: m.TodayActivitiesWidget,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} /> },
);

export interface HomeWidgetGridProps {
  projectsEnabled: boolean;
  hrEnabled: boolean;
  canViewExecutive: boolean;
  canSelfAttendance: boolean;
  crmEnabled: boolean;
  canViewCrmLeads: boolean;
  expensesSlot?: ReactNode;
}

export function HomeWidgetGrid({
  projectsEnabled,
  hrEnabled,
  canViewExecutive,
  canSelfAttendance,
  crmEnabled,
  canViewCrmLeads,
  expensesSlot,
}: HomeWidgetGridProps) {
  const { fadeUp } = useMotionVariants();
  const customisation = useHomeCustomisation();
  const { isHidden, state } = customisation;
  const gapClass = state.density === "compact" ? "gap-2" : "gap-4";

  const availableWidgets = useMemo((): readonly WidgetOption[] => {
    const candidates: Array<WidgetOption & { visible: boolean }> = [
      { id: "My tasks", label: "My tasks", visible: projectsEnabled },
      { id: "Timesheet", label: "Timesheet", visible: projectsEnabled },
      { id: "Leave balance", label: "Leave balance", visible: hrEnabled },
      { id: "Alerts", label: "Alerts", visible: true },
      { id: "Announcements", label: "Announcements", visible: true },
      { id: "Upcoming events", label: "Upcoming events", visible: true },
      {
        id: "Business pulse",
        label: "Business pulse",
        visible: canViewExecutive,
      },
      {
        id: "Today's activities",
        label: "Today's activities",
        visible: crmEnabled && canViewCrmLeads,
      },
      {
        id: "My attendance",
        label: "My attendance",
        visible: hrEnabled && canSelfAttendance,
      },
      { id: "Payroll", label: "Payroll", visible: true },
      { id: "Expenses", label: "Expenses", visible: Boolean(expensesSlot) },
    ];
    return candidates
      .filter((w) => w.visible)
      .map(({ id, label }) => ({ id, label }));
  }, [
    projectsEnabled,
    hrEnabled,
    canViewExecutive,
    canSelfAttendance,
    crmEnabled,
    canViewCrmLeads,
    expensesSlot,
  ]);

  const allAccessibleIds = availableWidgets.map((w) => w.id);
  const orderedVisibleIds = applyWidgetOrder(
    allAccessibleIds,
    state.widgetOrder,
  ).filter((id) => !isHidden(id));

  const widgetNodes: Record<string, ReactNode> = {
    "My tasks": (
      <HomeSectionBoundary sectionLabel="My tasks">
        <MyTasksWidget />
      </HomeSectionBoundary>
    ),
    Timesheet: (
      <HomeSectionBoundary sectionLabel="Timesheet">
        <TimesheetWidget />
      </HomeSectionBoundary>
    ),
    "Leave balance": (
      <HomeSectionBoundary sectionLabel="Leave balance">
        <LeaveBalanceWidget />
      </HomeSectionBoundary>
    ),
    Alerts: (
      <HomeSectionBoundary sectionLabel="Alerts">
        <AlertsWidget />
      </HomeSectionBoundary>
    ),
    Announcements: (
      <HomeSectionBoundary sectionLabel="Announcements">
        <AnnouncementsWidget />
      </HomeSectionBoundary>
    ),
    "Upcoming events": (
      <HomeSectionBoundary sectionLabel="Upcoming events">
        <UpcomingEventsWidget />
      </HomeSectionBoundary>
    ),
    "Business pulse": (
      <HomeSectionBoundary sectionLabel="Business pulse">
        <BusinessPulseWidget />
      </HomeSectionBoundary>
    ),
    "Today's activities": (
      <HomeSectionBoundary sectionLabel="Today's activities">
        <TodayActivitiesWidget />
      </HomeSectionBoundary>
    ),
    "My attendance": (
      <HomeSectionBoundary sectionLabel="My attendance">
        <MyAttendanceWidget />
      </HomeSectionBoundary>
    ),
    Payroll: (
      <HomeSectionBoundary sectionLabel="Payroll">
        <PayrollWidget />
      </HomeSectionBoundary>
    ),
    Expenses: expensesSlot ? (
      <HomeSectionBoundary sectionLabel="Expenses">
        {expensesSlot}
      </HomeSectionBoundary>
    ) : null,
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <HomeSectionHeader title="My day" />
        <HomeCustomisationBar
          customisation={customisation}
          availableWidgets={availableWidgets}
        />
      </div>
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className={`grid grid-cols-1 ${gapClass} md:grid-cols-2 xl:grid-cols-3`}
      >
        {orderedVisibleIds.map((id) => {
          const node = widgetNodes[id];
          if (!node) return null;
          return <Fragment key={id}>{node}</Fragment>;
        })}
      </motion.div>
    </>
  );
}
