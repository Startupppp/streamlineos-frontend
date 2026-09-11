"use client";

import { useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  useRecentProjects,
  useTeamAttendance,
  useActiveSprintSummary,
  useRecentActivity,
  useTodayActivities,
  useMyIssues,
} from "@/hooks/api/dashboard";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useMotionVariants } from "@/lib/motion-variants";
import { WidgetSkeleton } from "@/components/dashboard/widget-skeleton";
import { DeferredDashboardContent } from "./deferred-dashboard-content";
import { HomeSectionBoundary } from "./home-section-boundary";
import { HomeWidgetGrid } from "./home-widget-grid";
import type { DashboardTicket } from "@/features/dashboard/my-issues-card";
import type { DashboardAccess } from "@/features/dashboard/use-dashboard-access";

const SprintCard = dynamic(
  () => import("@/features/dashboard/sprint-card").then((m) => ({ default: m.SprintCard })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} /> },
);
const TeamCard = dynamic(
  () => import("@/features/dashboard/team-card").then((m) => ({ default: m.TeamCard })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} /> },
);
const MyIssuesCard = dynamic(
  () => import("@/features/dashboard/my-issues-card").then((m) => ({ default: m.MyIssuesCard })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} /> },
);
const RecentProjectsCard = dynamic(
  () =>
    import("@/features/dashboard/recent-projects-card").then((m) => ({
      default: m.RecentProjectsCard,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} /> },
);
const RecentActivityCard = dynamic(
  () =>
    import("@/features/dashboard/recent-activity-card").then((m) => ({
      default: m.RecentActivityCard,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} /> },
);

const LeavesTodayWidget = dynamic(
  () =>
    import("@/features/dashboard/hr-widgets").then((m) => ({
      default: m.LeavesTodayWidget,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} /> },
);
const TeamAttendanceWidget = dynamic(
  () =>
    import("@/features/dashboard/hr-widgets").then((m) => ({
      default: m.TeamAttendanceWidget,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} /> },
);
const PendingApprovalsWidget = dynamic(
  () =>
    import("@/features/dashboard/hr-widgets").then((m) => ({
      default: m.PendingApprovalsWidget,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} /> },
);
const BirthdaysWidget = dynamic(
  () =>
    import("@/features/dashboard/hr-widgets").then((m) => ({
      default: m.BirthdaysWidget,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} /> },
);
const UpcomingHolidaysWidget = dynamic(
  () =>
    import("@/features/dashboard/hr-widgets").then((m) => ({
      default: m.UpcomingHolidaysWidget,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} /> },
);

interface DashboardDeferredBodyProps {
  access: DashboardAccess;
  expensesSlot?: ReactNode;
  publicDocumentsSlot?: ReactNode;
}

export function DashboardDeferredBody({ access, expensesSlot, publicDocumentsSlot }: DashboardDeferredBodyProps) {
  const { fadeUp } = useMotionVariants();
  const router = useRouter();
  const {
    hrEnabled,
    crmEnabled,
    projectsEnabled,
    canViewAttendance,
    canSelfAttendance,
    canViewLeaves,
    canApproveLeaves,
    canViewExecutive,
    canViewCrmLeads,
    canViewTickets,
    signEnabled,
    canViewSignEnvelopes,
  } = access;

  const [deferredVisible, setDeferredVisible] = useState(false);
  const [batch2Ready, setBatch2Ready] = useState(false);

  const {
    data: recentProjects,
    isLoading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects,
  } = useRecentProjects({
    enabled: deferredVisible && projectsEnabled && canViewTickets,
  });
  const {
    data: teamAttendance,
    isLoading: teamLoading,
    error: teamError,
    refetch: refetchTeam,
  } = useTeamAttendance({
    enabled: deferredVisible && hrEnabled && canViewAttendance,
  });
  const teamAvailability = useMemo(
    () =>
      teamAttendance?.records.map((record) => ({
        userId: record.userId,
        name: record.userName ?? "Team member",
        image: record.userImage,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        isOnline: Boolean(record.checkIn && !record.checkOut),
      })),
    [teamAttendance],
  );
  const {
    data: recentActivity,
    isLoading: activityLoading,
    error: activityError,
    refetch: refetchActivity,
  } = useRecentActivity({
    enabled: deferredVisible && projectsEnabled && canViewTickets,
  });
  /**
   * No `deferredVisible` here, deliberately. `DashboardClient` observes the
   * same `queryKeys.dashboard.myIssues()` key eagerly for the above-the-fold
   * open-issue stat card, and TanStack enables a query when ANY observer
   * enables it — so a deferral written here would read as deferral and never
   * postpone a request. Stating the real condition keeps the guard honest.
   */
  const {
    data: myIssuesData,
    isLoading: ticketsLoading,
    error: ticketsError,
    refetch: refetchTickets,
  } = useMyIssues({ enabled: projectsEnabled });
  const {
    data: sprintSummary,
    isLoading: sprintLoading,
    error: sprintError,
    refetch: refetchSprint,
  } = useActiveSprintSummary({
    enabled: deferredVisible && projectsEnabled,
  });
  const { data: todayActivities } = useTodayActivities({
    enabled: deferredVisible && crmEnabled && canViewCrmLeads,
  });

  const shownMeetingToastRef = useRef(false);
  useEffect(() => {
    if (
      todayActivities &&
      todayActivities.length > 0 &&
      !shownMeetingToastRef.current
    ) {
      shownMeetingToastRef.current = true;
      if (todayActivities.length === 1) {
        const a = todayActivities[0];
        toast.info(`Scheduled ${a.type} today: ${a.subject || "No subject"}`, {
          duration: 6000,
        });
      } else {
        toast.info(`${todayActivities.length} meetings/calls scheduled today`, {
          duration: 6000,
        });
      }
    }
  }, [todayActivities]);

  useEffect(() => {
    if (!deferredVisible) return;
    const id = setTimeout(() => setBatch2Ready(true), 0);
    return () => clearTimeout(id);
  }, [deferredVisible]);

  const handleDeferredVisible = useCallback(() => {
    setDeferredVisible(true);
  }, []);
  const handleGoToProjects = useCallback(
    () => router.push("/build/all"),
    [router],
  );
  const handleRetryTickets = useCallback(
    () => void refetchTickets(),
    [refetchTickets],
  );
  const handleRetryProjects = useCallback(
    () => void refetchProjects(),
    [refetchProjects],
  );
  const handleRetryActivity = useCallback(
    () => void refetchActivity(),
    [refetchActivity],
  );
  const handleRetrySprint = useCallback(
    () => void refetchSprint(),
    [refetchSprint],
  );
  const handleRetryTeam = useCallback(() => void refetchTeam(), [refetchTeam]);

  const sortedMyTickets = useMemo((): DashboardTicket[] => {
    const raw = myIssuesData ?? [];
    const toDashboardTicket = (t: (typeof raw)[number]): DashboardTicket => ({
      id: t.id,
      type: t.type,
      status: t.status,
      ticketNumber: t.ticketNumber,
      title: t.title,
      priority: t.priority,
      project:
        t.projectId != null
          ? { id: t.projectId, name: t.projectName, key: t.projectKey }
          : null,
    });
    const inProgress = raw.filter(
      (t) => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW",
    );
    const todo = raw.filter(
      (t) => t.status === "TODO" || t.status === "BACKLOG",
    );
    return [...inProgress, ...todo].map(toDashboardTicket);
  }, [myIssuesData]);

  const showHrTeamRow =
    hrEnabled && (canViewLeaves || canViewAttendance || canApproveLeaves);
  const showDocumentsCard = hrEnabled || (signEnabled && canViewSignEnvelopes);
  const showBottomRow =
    (projectsEnabled && canViewTickets) || (hrEnabled && canViewAttendance);

  return (
    <DeferredDashboardContent
      onVisible={handleDeferredVisible}
      fallback={
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <WidgetSkeleton rows={3} />
          <WidgetSkeleton rows={3} />
          <WidgetSkeleton rows={3} />
        </div>
      }
    >
      <>
        <HomeWidgetGrid
          projectsEnabled={projectsEnabled}
          hrEnabled={hrEnabled}
          canViewExecutive={canViewExecutive}
          canSelfAttendance={canSelfAttendance}
          expensesSlot={expensesSlot}
        />

        {showHrTeamRow && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {canViewLeaves && (
              <HomeSectionBoundary sectionLabel="Who is out today">
                <LeavesTodayWidget />
              </HomeSectionBoundary>
            )}
            {canViewAttendance && (
              <HomeSectionBoundary sectionLabel="Team attendance">
                <TeamAttendanceWidget
                  data={teamAttendance}
                  isLoading={teamLoading}
                  error={teamError}
                  onRetry={handleRetryTeam}
                />
              </HomeSectionBoundary>
            )}
            {canApproveLeaves && (
              <HomeSectionBoundary sectionLabel="Pending approvals">
                <PendingApprovalsWidget />
              </HomeSectionBoundary>
            )}
          </motion.div>
        )}

        {batch2Ready && hrEnabled && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <HomeSectionBoundary sectionLabel="Birthdays">
              <BirthdaysWidget />
            </HomeSectionBoundary>
            <HomeSectionBoundary sectionLabel="Upcoming holidays">
              <UpcomingHolidaysWidget />
            </HomeSectionBoundary>
          </motion.div>
        )}

        {batch2Ready && showDocumentsCard && publicDocumentsSlot ? (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
          >
            <HomeSectionBoundary sectionLabel="Company documents">
              {publicDocumentsSlot}
            </HomeSectionBoundary>
          </motion.div>
        ) : null}

        {batch2Ready && projectsEnabled && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-4 md:auto-rows-[22rem] lg:grid-cols-7"
          >
            <div className="min-h-0 lg:col-span-4">
              <HomeSectionBoundary sectionLabel="My issues">
                <MyIssuesCard
                  tickets={sortedMyTickets}
                  isLoading={ticketsLoading}
                  error={ticketsError}
                  onRetry={handleRetryTickets}
                />
              </HomeSectionBoundary>
            </div>
            <div className="min-h-0 lg:col-span-3">
              <HomeSectionBoundary sectionLabel="Active sprint">
                <SprintCard
                  summary={sprintSummary ?? undefined}
                  isLoading={sprintLoading}
                  error={sprintError}
                  onRetry={handleRetrySprint}
                />
              </HomeSectionBoundary>
            </div>
          </motion.div>
        )}

        {batch2Ready && showBottomRow && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:auto-rows-[22rem] lg:grid-cols-3"
          >
            {projectsEnabled && canViewTickets && (
              <div className="min-h-0">
                <HomeSectionBoundary sectionLabel="Recent projects">
                  <RecentProjectsCard
                    projects={recentProjects?.map((p) => ({
                      ...p,
                      key: p.key ?? "",
                    }))}
                    isLoading={projectsLoading}
                    error={projectsError}
                    onCreateProject={handleGoToProjects}
                    onRetry={handleRetryProjects}
                  />
                </HomeSectionBoundary>
              </div>
            )}
            {projectsEnabled && canViewTickets && (
              <div className="min-h-0">
                <HomeSectionBoundary sectionLabel="Recent activity">
                  <RecentActivityCard
                    items={recentActivity}
                    isLoading={activityLoading}
                    error={activityError}
                    onRetry={handleRetryActivity}
                  />
                </HomeSectionBoundary>
              </div>
            )}
            {hrEnabled && canViewAttendance && (
              <div className="min-h-0">
                <HomeSectionBoundary sectionLabel="Team availability">
                  <TeamCard
                    members={teamAvailability}
                    isLoading={teamLoading}
                    error={teamError}
                    onRetry={handleRetryTeam}
                  />
                </HomeSectionBoundary>
              </div>
            )}
          </motion.div>
        )}
      </>
    </DeferredDashboardContent>
  );
}
