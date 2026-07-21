"use client";

import { useMemo, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  useDashboardStats,
  useRecentProjects,
  useTeamAvailability,
  useActiveSprintSummary,
  useRecentActivity,
  useTodayActivities,
  useMyIssues,
} from "@/hooks/api/dashboard";
import {
  useNotifications,
  useUnreadNotificationCount,
} from "@/hooks/api/notifications";
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
import { MyTasksWidget } from "@/components/dashboard/my-tasks-widget";
import { TimesheetWidget } from "@/components/dashboard/timesheet-widget";
import { AnnouncementsWidget } from "@/components/dashboard/announcements-widget";
import { UpcomingEventsWidget } from "@/components/dashboard/upcoming-events-widget";
import { shouldRenderDashboardLoading } from "./dashboard-hydration";

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
    canViewLeaves,
    canApproveLeaves,
    canViewExecutive,
    canViewCrmLeads,
    canViewTickets,
  } = access;

  const [headerClock, setHeaderClock] = useState<{
    greeting: string;
    todayFormatted: string;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

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
  } = useRecentProjects({ enabled: projectsEnabled && canViewTickets });
  const { data: teamAvailability, isLoading: teamLoading } =
    useTeamAvailability({ enabled: hrEnabled && canViewAttendance });
  const {
    data: recentActivity,
    isLoading: activityLoading,
    error: activityError,
  } = useRecentActivity({ enabled: projectsEnabled && canViewTickets });

  const {
    data: myIssuesData,
    isLoading: ticketsLoading,
    error: ticketsError,
  } = useMyIssues(currentUserId ?? "", { enabled: projectsEnabled });

  const { data: sprintSummary, isLoading: sprintLoading } =
    useActiveSprintSummary({ enabled: projectsEnabled });

  const { data: todayActivities } = useTodayActivities({
    enabled: crmEnabled && canViewCrmLeads,
  });

  const prevUnreadRef = useRef<number | null>(null);
  const { data: unreadData } = useUnreadNotificationCount();
  const { data: latestNotifications } = useNotifications({ limit: 5 });

  useEffect(() => {
    if (unreadData === undefined) return;
    const currentCount = unreadData.count ?? 0;
    if (
      prevUnreadRef.current !== null &&
      currentCount > prevUnreadRef.current &&
      latestNotifications
    ) {
      const newOnes = latestNotifications.slice(
        0,
        currentCount - prevUnreadRef.current,
      );
      for (const n of newOnes) {
        toast(n.title, { description: n.message ?? undefined, duration: 5000 });
      }
    }
    prevUnreadRef.current = currentCount;
  }, [unreadData, latestNotifications]);

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
    ? `${headerClock.greeting}, ${firstName}`
    : "Dashboard";

  const handleRefresh = useCallback(() => void refetch(), [refetch]);
  const handleGoToProjects = useCallback(
    () => router.push("/projects/all"),
    [router],
  );

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
      <PageWrapper title={pageTitle} subtitle="Loading your workspace…">
        <div
          className="space-y-4"
          role="status"
          aria-live="polite"
          aria-label="Loading dashboard"
        >
          <DashboardStatsSkeleton />
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
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
      <div className="space-y-4">
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

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
        >
          {projectsEnabled && <MyTasksWidget />}
          {projectsEnabled && <TimesheetWidget />}
          {hrEnabled && <LeaveBalanceWidget />}
          <AnnouncementsWidget />
          <UpcomingEventsWidget />
          {canViewExecutive && <BusinessPulseWidget />}
        </motion.div>

        {showHrTeamRow && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
          >
            {canViewLeaves && <LeavesTodayWidget />}
            {canViewAttendance && <TeamAttendanceWidget />}
            {canApproveLeaves && <PendingApprovalsWidget />}
          </motion.div>
        )}

        {hrEnabled && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="grid gap-3 grid-cols-1 md:grid-cols-2"
          >
            <BirthdaysWidget />
            <UpcomingHolidaysWidget />
          </motion.div>
        )}

        {hrEnabled && (
          <motion.div variants={fadeUp} initial="hidden" animate="visible">
            <PublicDocumentsCard />
          </motion.div>
        )}

        {showProjectsRow && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="grid gap-3 grid-cols-1 lg:grid-cols-7 md:auto-rows-[22rem]"
          >
            <div className="lg:col-span-4 min-h-0">
              <MyIssuesCard
                tickets={sortedMyTickets}
                isLoading={ticketsLoading}
                error={ticketsError}
              />
            </div>
            <div className="lg:col-span-3 min-h-0">
              <SprintCard
                summary={sprintSummary ?? undefined}
                isLoading={sprintLoading}
              />
            </div>
          </motion.div>
        )}

        {showBottomRow && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 md:auto-rows-[22rem]"
          >
            {projectsEnabled && canViewTickets && (
              <div className="min-h-0">
                <RecentProjectsCard
                  projects={recentProjects?.map((p) => ({
                    ...p,
                    key: p.key ?? "",
                  }))}
                  isLoading={projectsLoading}
                  error={projectsError}
                  onCreateProject={handleGoToProjects}
                />
              </div>
            )}
            {projectsEnabled && canViewTickets && (
              <div className="min-h-0">
                <RecentActivityCard
                  items={recentActivity}
                  isLoading={activityLoading}
                  error={activityError}
                />
              </div>
            )}
            {hrEnabled && canViewAttendance && (
              <div className="min-h-0">
                <TeamCard members={teamAvailability} isLoading={teamLoading} />
              </div>
            )}
          </motion.div>
        )}
      </div>
    </PageWrapper>
  );
}
