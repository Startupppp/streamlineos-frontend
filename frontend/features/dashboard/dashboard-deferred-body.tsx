"use client";

import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  useRecentProjects,
  useTeamAttendance,
  useActiveSprintSummary,
  useRecentActivity,
  useMyIssues,
} from "@/hooks/api/dashboard";
import { motion } from "framer-motion";
import { useMotionVariants } from "@/lib/motion-variants";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { WidgetSkeleton } from "@/components/dashboard/widget-skeleton";
import { DeferredDashboardContent } from "./deferred-dashboard-content";
import { SectionErrorBoundary } from "@/components/shared/section-error-boundary";
import { HomeSectionHeader } from "./home-section-header";
import { HomeWidgetGrid } from "./home-widget-grid";
import type { DashboardTicket } from "@/features/dashboard/my-issues-card";
import type { DashboardAccess } from "@/features/dashboard/use-dashboard-access";

const SprintCard = dynamic(
  () =>
    import("@/features/dashboard/sprint-card").then((m) => ({
      default: m.SprintCard,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} variant="list" /> },
);
const TeamCard = dynamic(
  () =>
    import("@/features/dashboard/team-card").then((m) => ({
      default: m.TeamCard,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} variant="activity" /> },
);
const MyIssuesCard = dynamic(
  () =>
    import("@/features/dashboard/my-issues-card").then((m) => ({
      default: m.MyIssuesCard,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={4} variant="list" /> },
);
const RecentProjectsCard = dynamic(
  () =>
    import("@/features/dashboard/recent-projects-card").then((m) => ({
      default: m.RecentProjectsCard,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} variant="list" /> },
);
const RecentActivityCard = dynamic(
  () =>
    import("@/features/dashboard/recent-activity-card").then((m) => ({
      default: m.RecentActivityCard,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={4} variant="activity" /> },
);

const LeavesTodayWidget = dynamic(
  () =>
    import("@/features/dashboard/hr-widgets").then((m) => ({
      default: m.LeavesTodayWidget,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} variant="list" /> },
);
const TeamAttendanceWidget = dynamic(
  () =>
    import("@/features/dashboard/hr-widgets").then((m) => ({
      default: m.TeamAttendanceWidget,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} variant="activity" /> },
);
const PendingApprovalsWidget = dynamic(
  () =>
    import("@/features/dashboard/hr-widgets").then((m) => ({
      default: m.PendingApprovalsWidget,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} variant="list" /> },
);
const BirthdaysWidget = dynamic(
  () =>
    import("@/features/dashboard/hr-widgets").then((m) => ({
      default: m.BirthdaysWidget,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} variant="activity" /> },
);
const UpcomingHolidaysWidget = dynamic(
  () =>
    import("@/features/dashboard/hr-widgets").then((m) => ({
      default: m.UpcomingHolidaysWidget,
    })),
  { ssr: false, loading: () => <WidgetSkeleton rows={3} variant="list" /> },
);

interface DashboardDeferredBodyProps {
  access: DashboardAccess;
  expensesSlot?: ReactNode;
  publicDocumentsSlot?: ReactNode;
}

export function DashboardDeferredBody({
  access,
  expensesSlot,
  publicDocumentsSlot,
}: DashboardDeferredBodyProps) {
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
    payrollEnabled,
    canViewPayrollSelf,
  } = access;

  const accountingEnabled = useModuleEnabled("accounting");
  const canViewExpenses = useCan("hr:expenses:view");
  const expensesEnabled = accountingEnabled && canViewExpenses;

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

  useEffect(() => {
    if (!deferredVisible) return;
    const id = setTimeout(() => setBatch2Ready(true), 0);
    return () => clearTimeout(id);
  }, [deferredVisible]);

  const handleDeferredVisible = useCallback(() => {
    setDeferredVisible(true);
  }, []);
  const handleGoToProjects = useCallback(() => router.push("/build/projects"), [router]);
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
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          <WidgetSkeleton rows={4} variant="list" />
          <WidgetSkeleton rows={3} variant="list" />
          <WidgetSkeleton
            rows={4}
            variant="activity"
            className="hidden md:flex"
          />
        </div>
      }
    >
      <>
        <HomeWidgetGrid
          projectsEnabled={projectsEnabled}
          hrEnabled={hrEnabled}
          canViewExecutive={canViewExecutive}
          canSelfAttendance={canSelfAttendance}
          crmEnabled={crmEnabled}
          canViewCrmLeads={canViewCrmLeads}
          payrollEnabled={payrollEnabled}
          canViewPayrollSelf={canViewPayrollSelf}
          expensesEnabled={expensesEnabled}
          expensesSlot={expensesSlot}
        />

        {showHrTeamRow && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            <div className="col-span-full">
              <HomeSectionHeader title="Team" />
            </div>
            {canViewLeaves && (
              <SectionErrorBoundary sectionLabel="Who is out today">
                <LeavesTodayWidget />
              </SectionErrorBoundary>
            )}
            {canViewAttendance && (
              <SectionErrorBoundary sectionLabel="Team attendance">
                <TeamAttendanceWidget
                  data={teamAttendance}
                  isLoading={teamLoading}
                  error={teamError}
                  onRetry={handleRetryTeam}
                />
              </SectionErrorBoundary>
            )}
            {canApproveLeaves && (
              <SectionErrorBoundary sectionLabel="Pending approvals">
                <PendingApprovalsWidget />
              </SectionErrorBoundary>
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
            <SectionErrorBoundary sectionLabel="Birthdays">
              <BirthdaysWidget />
            </SectionErrorBoundary>
            <SectionErrorBoundary sectionLabel="Upcoming holidays">
              <UpcomingHolidaysWidget />
            </SectionErrorBoundary>
          </motion.div>
        )}

        {batch2Ready && showDocumentsCard && publicDocumentsSlot ? (
          <motion.div variants={fadeUp} initial="hidden" animate="visible">
            <SectionErrorBoundary sectionLabel="Company documents">
              {publicDocumentsSlot}
            </SectionErrorBoundary>
          </motion.div>
        ) : null}

        {batch2Ready && projectsEnabled && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-4"
          >
            <HomeSectionHeader title="Business" />
            <div className="grid grid-cols-1 gap-4 md:auto-rows-[22rem] lg:grid-cols-7">
              <div className="min-h-0 lg:col-span-4">
                <SectionErrorBoundary sectionLabel="My issues">
                  <MyIssuesCard
                    tickets={sortedMyTickets}
                    isLoading={ticketsLoading}
                    error={ticketsError}
                    onRetry={handleRetryTickets}
                  />
                </SectionErrorBoundary>
              </div>
              <div className="min-h-0 lg:col-span-3">
                <SectionErrorBoundary sectionLabel="Active sprint">
                  <SprintCard
                    summary={sprintSummary ?? undefined}
                    isLoading={sprintLoading}
                    error={sprintError}
                    onRetry={handleRetrySprint}
                  />
                </SectionErrorBoundary>
              </div>
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
                <SectionErrorBoundary sectionLabel="Recent projects">
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
                </SectionErrorBoundary>
              </div>
            )}
            {projectsEnabled && canViewTickets && (
              <div className="min-h-0">
                <SectionErrorBoundary sectionLabel="Recent activity">
                  <RecentActivityCard
                    items={recentActivity}
                    isLoading={activityLoading}
                    error={activityError}
                    onRetry={handleRetryActivity}
                  />
                </SectionErrorBoundary>
              </div>
            )}
            {hrEnabled && canViewAttendance && (
              <div className="min-h-0">
                <SectionErrorBoundary sectionLabel="Team availability">
                  <TeamCard
                    members={teamAvailability}
                    isLoading={teamLoading}
                    error={teamError}
                    onRetry={handleRetryTeam}
                  />
                </SectionErrorBoundary>
              </div>
            )}
          </motion.div>
        )}
      </>
    </DeferredDashboardContent>
  );
}
