"use client";

import { useMemo, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  useDashboardStats,
  useRecentProjects,
  useTeamAttendance,
  useActiveSprintSummary,
  useRecentActivity,
  useTodayActivities,
  useMyIssues,
} from "@/hooks/api/dashboard";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/get-error-message";
import { ClockInWidget } from "@/components/attendance/clock-in-widget";
import { DashboardStatsSkeleton } from "@/components/ui/dashboard-skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion-variants";
import { getGreeting, getFirstName } from "@/lib/format-utils";
import { QuickActions } from "@/features/dashboard/quick-actions";
import { SprintCard } from "@/features/dashboard/sprint-card";
import { TeamCard } from "@/features/dashboard/team-card";
import {
  MyIssuesCard,
  type DashboardTicket,
} from "@/features/dashboard/my-issues-card";
import { RecentProjectsCard } from "@/features/dashboard/recent-projects-card";
import { RecentActivityCard } from "@/features/dashboard/recent-activity-card";
import { WidgetSkeleton } from "@/components/dashboard/widget-skeleton";
import { ModuleSetupBanners } from "@/features/dashboard/module-setup-banners";
import { useDashboardAccess } from "@/features/dashboard/use-dashboard-access";
import { useDashboardStatCards } from "@/features/dashboard/use-dashboard-stat-cards";
import {
  LeavesTodayWidget,
  TeamAttendanceWidget,
  PendingApprovalsWidget,
  BirthdaysWidget,
  LeaveBalanceWidget,
  UpcomingHolidaysWidget,
} from "@/features/dashboard/hr-widgets";
import { PublicDocumentsCard } from "@/features/dashboard/public-documents-card";
import { MyAttendanceWidget } from "@/features/dashboard/my-attendance-widget";
import { PayrollWidget } from "@/features/dashboard/payroll-widget";
import { ExpensesWidget } from "@/features/dashboard/expenses-widget";
import { RecruitmentWidget } from "@/features/dashboard/recruitment-widget";
import { AlertsWidget } from "@/features/dashboard/alerts-widget";
import { MyTasksWidget } from "@/components/dashboard/my-tasks-widget";
import { TimesheetWidget } from "@/components/dashboard/timesheet-widget";
import { AnnouncementsWidget } from "@/components/dashboard/announcements-widget";
import { UpcomingEventsWidget } from "@/components/dashboard/upcoming-events-widget";
import { shouldRenderDashboardLoading } from "./dashboard-hydration";
import { DeferredDashboardContent } from "./deferred-dashboard-content";
import { HomeSectionBoundary } from "./home-section-boundary";

const ExecutiveKpiWidget = dynamic(
  () =>
    import("@/components/dashboard/executive-kpi-widget").then((m) => ({
      default: m.ExecutiveKpiWidget,
    })),
  { loading: () => <WidgetSkeleton rows={2} /> },
);

const BusinessPulseWidget = dynamic(
  () =>
    import("@/components/dashboard/project-health-widget").then((m) => ({
      default: m.BusinessPulseWidget,
    })),
  { loading: () => <WidgetSkeleton rows={2} /> },
);

export function DashboardClient() {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const firstName = getFirstName(session);
  const access = useDashboardAccess();
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

  const [headerClock, setHeaderClock] = useState<{
    greeting: string;
    todayFormatted: string;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [deferredVisible, setDeferredVisible] = useState(false);

  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useDashboardStats({ retry: 2, retryDelay: 1000 });

  const {
    data: recentProjects,
    isLoading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects,
  } = useRecentProjects({
    enabled: deferredVisible && projectsEnabled && canViewTickets,
  });
  const { data: teamAttendance, isLoading: teamLoading } = useTeamAttendance({
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
  } = useMyIssues({ enabled: deferredVisible && projectsEnabled });

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
    setHeaderClock({
      greeting: getGreeting(),
      todayFormatted: format(new Date(), "EEEE, MMMM do, yyyy"),
    });
    setMounted(true);
  }, []);

  const pageTitle = headerClock
    ? firstName
      ? `${headerClock.greeting}, ${firstName}`
      : headerClock.greeting
    : "Dashboard";

  const handleRefresh = useCallback(() => void refetch(), [refetch]);
  const handleDeferredVisible = useCallback(() => {
    setDeferredVisible(true);
  }, []);
  const handleGoToProjects = useCallback(
    () => router.push("/build/all"),
    [router],
  );
  const handleRetryTickets = useCallback(() => void refetchTickets(), [refetchTickets]);
  const handleRetryProjects = useCallback(() => void refetchProjects(), [refetchProjects]);
  const handleRetryActivity = useCallback(() => void refetchActivity(), [refetchActivity]);
  const handleRetrySprint = useCallback(() => void refetchSprint(), [refetchSprint]);

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

  const statCards = useDashboardStatCards(
    stats,
    access,
    sortedMyTickets.length,
  );

  const showHrTeamRow =
    hrEnabled && (canViewLeaves || canViewAttendance || canApproveLeaves);
  const showDocumentsCard =
    hrEnabled || (signEnabled && canViewSignEnvelopes);
  const showProjectsRow = projectsEnabled;
  const showBottomRow =
    (projectsEnabled && canViewTickets) || (hrEnabled && canViewAttendance);

  if (
    shouldRenderDashboardLoading({
      accessLoading: access.accessLoading,
      isLoading,
      mounted,
    })
  ) {
    return (
      <PageWrapper title={pageTitle} subtitle="Loading your organization…">
        <div
          className="flex flex-1 min-h-0 flex-col gap-4"
          role="status"
          aria-live="polite"
          aria-label="Loading dashboard"
        >
          <DashboardStatsSkeleton />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <WidgetSkeleton rows={4} />
            <WidgetSkeleton rows={3} />
            <WidgetSkeleton rows={4} />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper title={pageTitle} subtitle="Something went wrong">
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-6"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 space-y-3">
              <p className="text-sm text-foreground">
                {getErrorMessage(error)}
              </p>
              <Button onClick={handleRefresh} size="sm">
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!stats) {
    return (
      <PageWrapper title={pageTitle}>
        <EmptyState
          illustration={<EmptyActivityIllustration className="h-40 w-40" />}
          title="No data available"
          description="Dashboard statistics are not available. Please try refreshing."
          action={{ label: "Refresh", onClick: handleRefresh }}
        />
      </PageWrapper>
    );
  }

  const pageSubtitle = headerClock
    ? `${headerClock.todayFormatted} · ${stats.orgName}`
    : stats.orgName;

  return (
    <PageWrapper
      title={pageTitle}
      subtitle={pageSubtitle}
      actions={hrEnabled ? <ClockInWidget /> : undefined}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {statCards.length > 0 && (
          <motion.div variants={fadeUp} initial="hidden" animate="visible">
            <StatCardGrid
              cols={statCards.length >= 4 ? 4 : statCards.length >= 3 ? 3 : 2}
            >
              {statCards.map((stat) => (
                <StatCard
                  key={stat.id}
                  label={stat.label}
                  value={stat.value}
                  icon={stat.icon}
                  href={stat.href}
                />
              ))}
            </StatCardGrid>
          </motion.div>
        )}

        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <QuickActions />
        </motion.div>

        <ModuleSetupBanners />

        {canViewExecutive && (
          <motion.div variants={fadeUp} initial="hidden" animate="visible">
            <ExecutiveKpiWidget />
          </motion.div>
        )}

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
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
            >
              {projectsEnabled && <HomeSectionBoundary sectionLabel="My tasks"><MyTasksWidget /></HomeSectionBoundary>}
              {projectsEnabled && <HomeSectionBoundary sectionLabel="Timesheet"><TimesheetWidget /></HomeSectionBoundary>}
              {hrEnabled && <HomeSectionBoundary sectionLabel="Leave balance"><LeaveBalanceWidget /></HomeSectionBoundary>}
              <HomeSectionBoundary sectionLabel="Alerts"><AlertsWidget /></HomeSectionBoundary>
              <HomeSectionBoundary sectionLabel="Announcements"><AnnouncementsWidget /></HomeSectionBoundary>
              <HomeSectionBoundary sectionLabel="Upcoming events"><UpcomingEventsWidget /></HomeSectionBoundary>
              {canViewExecutive && <HomeSectionBoundary sectionLabel="Business pulse"><BusinessPulseWidget /></HomeSectionBoundary>}
              {hrEnabled && canSelfAttendance && <HomeSectionBoundary sectionLabel="My attendance"><MyAttendanceWidget /></HomeSectionBoundary>}
              <HomeSectionBoundary sectionLabel="Payroll"><PayrollWidget /></HomeSectionBoundary>
              <HomeSectionBoundary sectionLabel="Expenses"><ExpensesWidget /></HomeSectionBoundary>
              <HomeSectionBoundary sectionLabel="Recruitment"><RecruitmentWidget /></HomeSectionBoundary>
            </motion.div>

        {showHrTeamRow && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {canViewLeaves && <HomeSectionBoundary sectionLabel="Who is out today"><LeavesTodayWidget /></HomeSectionBoundary>}
            {canViewAttendance && (
              <HomeSectionBoundary sectionLabel="Team attendance">
                <TeamAttendanceWidget
                  data={teamAttendance}
                  isLoading={teamLoading}
                />
              </HomeSectionBoundary>
            )}
            {canApproveLeaves && <HomeSectionBoundary sectionLabel="Pending approvals"><PendingApprovalsWidget /></HomeSectionBoundary>}
          </motion.div>
        )}

        {hrEnabled && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <HomeSectionBoundary sectionLabel="Birthdays"><BirthdaysWidget /></HomeSectionBoundary>
            <HomeSectionBoundary sectionLabel="Upcoming holidays"><UpcomingHolidaysWidget /></HomeSectionBoundary>
          </motion.div>
        )}

        {showDocumentsCard && (
          <motion.div variants={fadeUp} initial="hidden" animate="visible">
            <HomeSectionBoundary sectionLabel="Company documents"><PublicDocumentsCard /></HomeSectionBoundary>
          </motion.div>
        )}

        {showProjectsRow && (
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

            {showBottomRow && (
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
                  <TeamCard members={teamAvailability} isLoading={teamLoading} />
                </HomeSectionBoundary>
              </div>
            )}
          </motion.div>
            )}
          </>
        </DeferredDashboardContent>
      </div>
    </PageWrapper>
  );
}
