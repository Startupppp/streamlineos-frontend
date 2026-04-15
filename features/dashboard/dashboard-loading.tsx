"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { DashboardStatsSkeleton } from "@/components/ui/dashboard-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { WidgetSkeleton } from "@/components/dashboard/widgets/widget-skeleton";
import { getQuickActionsForRole } from "@/features/dashboard/quick-actions";

interface DashboardLoadingProps {
  role: string | undefined;
}

export function DashboardLoading({ role }: DashboardLoadingProps) {
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
      subtitle="Loading your workspace..."
      actions={<Skeleton className="h-10 w-32 rounded-md" />}
      contentClassName="min-h-[calc(100vh-170px)]"
    >
      <div className="space-y-5" role="status" aria-live="polite" aria-label="Loading dashboard">
        <DashboardStatsSkeleton />
        {quickActionsList.length > 0 ? (
          <div className={quickActionsGridClass}>
            {quickActionsList.map((a) => (
              <div key={a.label} className="rounded-xl border border-border bg-card p-4 shadow-noir">
                <div className="flex flex-col items-center gap-2">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`kpi-${i}`} className="rounded-xl border border-border bg-card p-4 shadow-noir">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          <WidgetSkeleton rows={4} />
          <WidgetSkeleton rows={3} />
          <WidgetSkeleton rows={4} />
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`mini-${i}`} className="rounded-xl border border-border bg-card p-4 shadow-noir">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
