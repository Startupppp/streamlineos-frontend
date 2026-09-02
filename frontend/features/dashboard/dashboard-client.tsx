"use client";

import { useMemo, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import {
  useDashboardStats,
  useMyIssues,
} from "@/hooks/api/dashboard";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/get-error-message";
const ClockInWidget = dynamic(
  () =>
    import("@/components/attendance/clock-in-widget").then((m) => ({
      default: m.ClockInWidget,
    })),
  { ssr: false },
);
import { DashboardStatsSkeleton } from "@/components/ui/dashboard-skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useMotionVariants } from "@/lib/motion-variants";
import { getGreeting, getFirstName } from "@/lib/format-utils";
import { QuickActions } from "@/features/dashboard/quick-actions";
import { WidgetSkeleton } from "@/components/dashboard/widget-skeleton";
import { ModuleSetupBanners } from "@/features/dashboard/module-setup-banners";
import { useDashboardAccess } from "@/features/dashboard/use-dashboard-access";
import { useDashboardStatCards } from "@/features/dashboard/use-dashboard-stat-cards";
import { useHomeCacheSync } from "./use-home-cache-sync";
import { DashboardDeferredBody } from "./dashboard-deferred-body";
import { shouldRenderDashboardLoading } from "./dashboard-hydration";
const GuidedTourOverlay = dynamic(
  () =>
    import("./guided-tour-overlay").then((m) => ({
      default: m.GuidedTourOverlay,
    })),
  { ssr: false },
);

const ExecutiveKpiWidget = dynamic(
  () =>
    import("@/components/dashboard/executive-kpi-widget").then((m) => ({
      default: m.ExecutiveKpiWidget,
    })),
  { loading: () => <WidgetSkeleton rows={2} /> },
);

export function DashboardClient() {
  const { fadeUp } = useMotionVariants();
  const { data: session } = useSession();
  const firstName = getFirstName(session);
  const access = useDashboardAccess();
  useHomeCacheSync();
  const { hrEnabled, canViewExecutive } = access;

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

  const { data: myIssuesData } = useMyIssues({
    enabled: access.projectsEnabled,
  });
  const openIssueCount = useMemo(
    () => myIssuesData?.length ?? 0,
    [myIssuesData],
  );

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

  const statCards = useDashboardStatCards(stats, access, openIssueCount);

  if (
    shouldRenderDashboardLoading({
      accessLoading: access.accessLoading,
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
          {isLoading ? (
            <DashboardStatsSkeleton />
          ) : error ? (
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
          ) : !stats ? (
            <EmptyState
              illustration={<EmptyActivityIllustration className="h-40 w-40" />}
              title="No data available"
              description="Dashboard statistics are not available. Please try refreshing."
              action={{ label: "Refresh", onClick: handleRefresh }}
            />
          ) : statCards.length > 0 ? (
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
          ) : null}

          <motion.div variants={fadeUp} initial="hidden" animate="visible">
            <QuickActions />
          </motion.div>

          <ModuleSetupBanners />

          {canViewExecutive && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible">
              <ExecutiveKpiWidget />
            </motion.div>
          )}

          <DashboardDeferredBody access={access} />
        </div>
      </PageWrapper>
      <GuidedTourOverlay />
    </>
  );
}
