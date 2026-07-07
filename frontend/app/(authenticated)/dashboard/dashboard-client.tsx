"use client";

import { useMemo, useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  useDashboardStats,
  useRecentProjects,
  useTeamAvailability,
  useActiveSprintSummary,
  useRecentActivity,
  useRoleStats,
  useTodayActivities,
  useMyIssues,
} from "@/hooks/api/dashboard";
import {
  useNotifications,
  useUnreadNotificationCount,
} from "@/hooks/api/notifications";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClockInWidget } from "@/components/attendance/clock-in-widget";
import { DashboardStatsSkeleton } from "@/components/ui/dashboard-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion-variants";
import { getGreeting, getFirstName } from "@/lib/format-utils";
import {
  QuickActions,
  getQuickActionsForRole,
} from "@/features/dashboard/quick-actions";
import { SprintCard } from "@/features/dashboard/sprint-card";
import { TeamCard } from "@/features/dashboard/team-card";
import {
  MyIssuesCard,
  type DashboardTicket,
} from "@/features/dashboard/my-issues-card";
import { RecentProjectsCard } from "@/features/dashboard/recent-projects-card";
import { RecentActivityCard } from "@/features/dashboard/recent-activity-card";
import { WidgetSkeleton } from "@/components/dashboard/widget-skeleton";
import { useCan } from "@/hooks/api/access";
import { CeoDashboard } from "@/features/dashboard/ceo-dashboard";
import { HrDashboard } from "@/features/dashboard/hr-dashboard";
import { SalesDashboard } from "@/features/dashboard/sales-dashboard";
import { EmployeeDashboard } from "@/features/dashboard/employee-dashboard";
import { useDashboardStatCards } from "@/features/dashboard/use-dashboard-stat-cards";
import { ModuleSetupBanners } from "@/features/dashboard/module-setup-banners";

const SALES_ROLES = ["SALES"] as const;
const HR_ROLES = ["HR", "BRANCH_HR"] as const;
const PROJECT_ROLES = [
  "ENGINEERING",
  "DESIGN",
  "VIDEO_EDITOR",
  "DIGITAL_MARKETING",
  "CUSTOMER_SUPPORT",
] as const;

type SalesRole = (typeof SALES_ROLES)[number];
type HrRole = (typeof HR_ROLES)[number];
type ProjectRole = (typeof PROJECT_ROLES)[number];

function isSalesRole(r: string | undefined): r is SalesRole {
  return r !== undefined && (SALES_ROLES as readonly string[]).includes(r);
}

function isHrRole(r: string | undefined): r is HrRole {
  return r !== undefined && (HR_ROLES as readonly string[]).includes(r);
}

function isProjectRole(r: string | undefined): r is ProjectRole {
  return r !== undefined && (PROJECT_ROLES as readonly string[]).includes(r);
}

export function DashboardClient() {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const firstName = getFirstName(session);
  const role = session?.user?.role;
  const isAdmin = useCan("hr:employees:manage");

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
  } = useRecentProjects();
  const { data: teamAvailability, isLoading: teamLoading } =
    useTeamAvailability();
  const {
    data: recentActivity,
    isLoading: activityLoading,
    error: activityError,
  } = useRecentActivity();

  const {
    data: myIssuesData,
    isLoading: ticketsLoading,
    error: ticketsError,
  } = useMyIssues(currentUserId ?? "");

  const { data: sprintSummary, isLoading: sprintLoading } =
    useActiveSprintSummary();

  const { data: roleStats } = useRoleStats();
  const { data: todayActivities } = useTodayActivities();

  const prevUnreadRef = useRef<number | null>(null);
  const { data: unreadData } = useUnreadNotificationCount({
    refetchInterval: 15000,
  });
  const { data: latestNotifications } = useNotifications(
    { limit: 5 },
    { refetchInterval: 15000 },
  );

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
        toast.info(
          `You have a scheduled ${a.type} today: ${a.subject || "No subject"}`,
          { duration: 6000 },
        );
      } else {
        toast.info(
          `You have ${todayActivities.length} scheduled meetings/calls today`,
          { duration: 6000 },
        );
      }
    }
  }, [todayActivities]);

  const greeting = useMemo(() => getGreeting(), []);
  const todayFormatted = useMemo(
    () => format(new Date(), "EEEE, MMMM do, yyyy"),
    [],
  );

  const handleRefresh = useCallback(() => void refetch(), [refetch]);
  const handleGoToProjects = useCallback(
    () => router.push("/projects/all"),
    [router],
  );

  const statCards = useDashboardStatCards(stats, role, roleStats);

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

  if (isLoading) {
    const quickActionsList = getQuickActionsForRole(role);
    const quickActionsGridClass = `grid grid-cols-2 gap-3 sm:grid-cols-3 ${
      quickActionsList.length >= 5
        ? "md:grid-cols-5"
        : quickActionsList.length >= 4
          ? "md:grid-cols-4"
          : "md:grid-cols-3"
    }`;

    return (
      <PageWrapper
        title="Dashboard"
        subtitle="Loading your workspace…"
        actions={<Skeleton className="h-9 w-32 rounded-md" />}
      >
        <div
          className="space-y-4"
          role="status"
          aria-live="polite"
          aria-label="Loading dashboard"
        >
          <DashboardStatsSkeleton />
          {quickActionsList.length > 0 && (
            <div className={quickActionsGridClass}>
              {quickActionsList.map((a) => (
                <div
                  key={a.label}
                  className="rounded-xl border border-border/70 bg-card p-4 shadow-noir"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          )}
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
      <PageWrapper title="Dashboard" subtitle="Something went wrong">
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-6"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 space-y-3">
              <p className="text-sm text-foreground">
                {error instanceof Error
                  ? error.message
                  : "Failed to load dashboard stats"}
              </p>
              <Button onClick={() => refetch()} size="sm">
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
      <PageWrapper title="Dashboard">
        <EmptyState
          illustration={<EmptyActivityIllustration className="h-40 w-40" />}
          title="No data available"
          description="Dashboard statistics are not available. Please try refreshing."
          action={{ label: "Refresh", onClick: handleRefresh }}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={`${greeting}, ${firstName}`}
      subtitle={`${todayFormatted} · ${stats.orgName}`}
      actions={<ClockInWidget />}
    >
      <div className="space-y-4">
        {statCards.length > 0 && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className={`grid gap-3 grid-cols-1 ${
              statCards.length >= 4
                ? "sm:grid-cols-2 lg:grid-cols-4"
                : statCards.length >= 3
                  ? "sm:grid-cols-2 md:grid-cols-3"
                  : "sm:grid-cols-2"
            }`}
          >
            {statCards.map((stat, i) => (
              <StatCard
                key={stat.id}
                label={stat.label}
                value={stat.value}
                icon={stat.icon}
                href={stat.href}
                index={i}
              />
            ))}
          </motion.div>
        )}

        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <QuickActions />
        </motion.div>

        <ModuleSetupBanners />

        {isAdmin ? (
          <CeoDashboard />
        ) : isSalesRole(role) ? (
          <SalesDashboard />
        ) : isHrRole(role) ? (
          <HrDashboard />
        ) : (
          <EmployeeDashboard />
        )}

        {(isAdmin || isProjectRole(role)) && (
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

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className={`grid gap-3 grid-cols-1 ${
            isAdmin ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"
          } md:auto-rows-[22rem]`}
        >
          {(isAdmin || isProjectRole(role)) && (
            <div className="sm:col-span-1 min-h-0">
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
          <div className="sm:col-span-1 min-h-0">
            <RecentActivityCard
              items={recentActivity}
              isLoading={activityLoading}
              error={activityError}
            />
          </div>
          {isAdmin && (
            <div className="sm:col-span-2 lg:col-span-1 min-h-0">
              <TeamCard members={teamAvailability} isLoading={teamLoading} />
            </div>
          )}
        </motion.div>
      </div>
    </PageWrapper>
  );
}
