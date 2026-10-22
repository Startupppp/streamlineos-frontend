import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PerformanceAnalyticsLoading() {
  return (
    <PageWrapper
      title="Performance Analytics"
      subtitle="Review cycle insights and metrics"
      backHref="/hr/performance"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <div className="space-y-4">
        <StatCardGridSkeleton cols={4} count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
        <Skeleton className="h-52 rounded-lg" />
      </div>
    </PageWrapper>
  );
}
