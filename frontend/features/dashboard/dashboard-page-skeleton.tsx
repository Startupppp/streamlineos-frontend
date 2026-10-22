import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { WidgetSkeleton } from "@/components/dashboard/widget-skeleton";

interface DashboardPageSkeletonProps {
  title?: string;
}

export function DashboardPageSkeleton({ title = "Dashboard" }: DashboardPageSkeletonProps) {
  return (
    <PageWrapper
      title={title}
      subtitle="Loading your organization…"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4" role="status" aria-label="Loading dashboard">
        <StatCardGridSkeleton cols={4} count={4} />
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-36 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-7 w-32 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <WidgetSkeleton rows={4} />
          <WidgetSkeleton rows={3} />
          <WidgetSkeleton rows={4} />
        </div>
      </div>
    </PageWrapper>
  );
}
