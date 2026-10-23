import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { WidgetSkeleton } from "@/components/dashboard/widget-skeleton";
import { ClockInWidgetSkeleton } from "@/components/attendance/clock-in-widget-skeleton";

interface DashboardPageSkeletonProps {
  title?: string;
}

export function DashboardPageSkeleton({
  title = "Dashboard",
}: DashboardPageSkeletonProps) {
  return (
    <PageWrapper
      title={title}
      subtitle={
        <span className="flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1">
          <Skeleton className="h-4 w-36 max-w-[55%] sm:w-40" />
          <span className="hidden text-muted-foreground sm:inline" aria-hidden>
            ·
          </span>
          <Skeleton className="h-4 w-24 max-w-[40%] sm:w-28" />
        </span>
      }
      actions={<ClockInWidgetSkeleton />}
    >
      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 sm:gap-4"
        role="status"
        aria-label="Loading dashboard"
      >
        <StatCardGridSkeleton cols={4} count={4} stackOnMobile={2} />

        <div
          className="flex min-w-0 flex-wrap items-center gap-2"
          aria-hidden="true"
        >
          <Skeleton className="h-7 w-[9.5rem] max-w-full rounded-full sm:w-36" />
          <Skeleton className="h-7 w-[8.5rem] max-w-full rounded-full sm:w-28" />
          <Skeleton className="h-7 w-[7.5rem] max-w-full rounded-full sm:w-32" />
          <Skeleton className="hidden h-7 w-24 rounded-full sm:block" />
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <Skeleton className="h-3 w-16 sm:w-20" />
            <Skeleton className="h-9 w-[6.5rem] shrink-0 rounded-md sm:w-28" />
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
            <WidgetSkeleton rows={4} variant="list" />
            <WidgetSkeleton rows={3} variant="list" />
            <WidgetSkeleton
              rows={4}
              variant="activity"
              className="hidden md:flex"
            />
            <WidgetSkeleton
              variant="pulse"
              className="h-auto md:col-span-2 xl:col-span-1"
            />
            <WidgetSkeleton
              rows={3}
              variant="list"
              className="hidden xl:flex"
            />
            <WidgetSkeleton
              rows={3}
              variant="list"
              className="hidden xl:flex"
            />
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
