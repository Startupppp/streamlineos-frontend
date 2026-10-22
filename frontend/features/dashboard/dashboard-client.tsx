"use client";

import { type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useDashboardStats, useExecutiveDashboard, useMyIssues } from "@/hooks/api/dashboard";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
const ClockInWidget = dynamic(
  () =>
    import("@/components/attendance/clock-in-widget").then((m) => ({
      default: m.ClockInWidget,
    })),
  { ssr: false, loading: ClockInWidgetSkeleton },
);
import { ClockInWidgetSkeleton } from "@/components/attendance/clock-in-widget-skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import {
  StatCard,
  StatCardGrid,
  StatCardGridSkeleton,
} from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useMotionVariants } from "@/lib/motion-variants";
import { getGreeting, getFirstName } from "@/lib/format-utils";
import { useHydrated } from "@/hooks/common/use-hydrated";
import { FocusStrip } from "@/features/dashboard/focus-strip";
import { useDashboardAccess } from "@/features/dashboard/use-dashboard-access";
import {
  executiveKpiStats,
  useDashboardStatCards,
} from "@/features/dashboard/use-dashboard-stat-cards";
import { DashboardDeferredBody } from "./dashboard-deferred-body";
import { DashboardPageSkeleton } from "./dashboard-page-skeleton";
import {
  HOME_ACCESS_DEADLINE_MS,
  shouldRenderAccessUnavailable,
  shouldRenderDashboardLoading,
} from "./dashboard-hydration";
import { useSettleDeadline } from "./use-settle-deadline";
const GuidedTourOverlay = dynamic(
  () =>
    import("./guided-tour-overlay").then((m) => ({
      default: m.GuidedTourOverlay,
    })),
  { ssr: false },
);

interface DashboardClientProps {
  expensesSlot?: ReactNode;
  publicDocumentsSlot?: ReactNode;
}

export function DashboardClient({
  expensesSlot,
  publicDocumentsSlot,
}: DashboardClientProps = {}) {
  const { fadeUp } = useMotionVariants();
  const { data: session } = useSession();
  const firstName = getFirstName(session);
  const access = useDashboardAccess();
  const accessDeadlineElapsed = useSettleDeadline(HOME_ACCESS_DEADLINE_MS);
  const { hrEnabled, canViewExecutive } = access;

  const hydrated = useHydrated();
  const headerClock = hydrated
    ? {
        greeting: getGreeting(),
        todayFormatted: format(new Date(), "EEEE, MMMM do, yyyy"),
      }
    : null;

  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useDashboardStats({ retry: 2, retryDelay: 1000 });

  const statsState = usePageState({
    isLoading,
    isError: Boolean(error),
    error,
    isEmpty: !stats,
  });

  const { data: myIssuesData } = useMyIssues({
    enabled: access.projectsEnabled,
  });
  const openIssueCount = myIssuesData?.length ?? 0;

  const pageTitle = headerClock
    ? firstName
      ? `${headerClock.greeting}, ${firstName}`
      : headerClock.greeting
    : "Dashboard";

  const {
    data: executive,
    isLoading: executiveLoading,
    isError: executiveError,
    refetch: refetchExecutive,
  } = useExecutiveDashboard({ enabled: canViewExecutive });

  function handleRefresh() {
    void refetch();
    void refetchExecutive();
  }

  const statCards = useDashboardStatCards(stats, access, openIssueCount);
  const executiveCards = executiveKpiStats({
    included: canViewExecutive,
    headcount: executive?.headcount,
    openRoles: executive?.openRoles,
    isLoading: canViewExecutive && executiveLoading && !executive,
    unavailable: canViewExecutive && executiveError && !executive,
  });
  const homeStatCards = executiveCards.length > 0
    ? [...statCards, ...executiveCards]
    : statCards;

  if (
    shouldRenderDashboardLoading({
      accessLoading: access.accessLoading,
      accessDeadlineElapsed,
      mounted: hydrated,
    })
  ) {
    return <DashboardPageSkeleton title={pageTitle} />;
  }

  if (
    shouldRenderAccessUnavailable({
      accessLoading: access.accessLoading,
      accessResolved: access.accessResolved,
      accessDeadlineElapsed,
    })
  ) {
    return (
      <PageWrapper title={pageTitle} subtitle="Your access could not be loaded">
        <ErrorState
          title="Home is unavailable"
          description="We could not confirm what you have access to, so no section can be shown. Try again."
          onRetry={access.refetchAccess}
        />
      </PageWrapper>
    );
  }

  const pageSubtitle = stats
    ? headerClock
      ? `${headerClock.todayFormatted} · ${stats.orgName}`
      : stats.orgName
    : (headerClock?.todayFormatted ?? undefined);

  return (
    <>
      <PageWrapper
        title={pageTitle}
        subtitle={pageSubtitle}
        actions={hrEnabled ? <ClockInWidget /> : undefined}
      >
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <PageState
            resolution={statsState}
            onRetry={handleRefresh}
            loading={<StatCardGridSkeleton cols={4} />}
            empty={
              <EmptyState
                illustration={
                  <EmptyActivityIllustration className="h-40 w-40" />
                }
                title="No data available"
                description="Dashboard statistics are not available. Please try refreshing."
                action={{ label: "Refresh", onClick: handleRefresh }}
              />
            }
          >
            {homeStatCards.length > 0 ? (
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="space-y-2"
              >
                <StatCardGrid
                  stackOnMobile={2}
                  minColumn="0"
                  cols={
                    homeStatCards.length >= 6
                      ? 6
                      : homeStatCards.length === 5
                        ? 5
                        : homeStatCards.length >= 4
                          ? 4
                          : homeStatCards.length === 3
                            ? 3
                            : 2
                  }
                >
                  {homeStatCards.map((stat) => (
                    <StatCard
                      key={stat.id}
                      label={stat.label}
                      value={stat.value}
                      hint={stat.hint}
                      icon={stat.icon}
                      isLoading={stat.isLoading}
                    />
                  ))}
                </StatCardGrid>
                {homeStatCards.some((stat) => stat.unavailable) && (
                  <div
                    role="status"
                    className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-status-warning-rule bg-status-warning-surface px-3 py-2"
                  >
                    <AlertCircle
                      className="h-4 w-4 shrink-0 text-status-warning-ink"
                      aria-hidden="true"
                    />
                    <p className="text-dense text-status-warning-ink">
                      Some figures could not be loaded and are shown as “—”.
                    </p>
                    <Button
                      onClick={handleRefresh}
                      size="sm"
                      variant="outline"
                      className="h-7"
                    >
                      <RefreshCw
                        className="mr-1.5 h-3 w-3"
                        aria-hidden="true"
                      />
                      Retry
                    </Button>
                  </div>
                )}
              </motion.div>
            ) : null}
          </PageState>

          <FocusStrip access={access} />

          <DashboardDeferredBody
            access={access}
            expensesSlot={expensesSlot}
            publicDocumentsSlot={publicDocumentsSlot}
          />
        </div>
      </PageWrapper>
      <GuidedTourOverlay />
    </>
  );
}
