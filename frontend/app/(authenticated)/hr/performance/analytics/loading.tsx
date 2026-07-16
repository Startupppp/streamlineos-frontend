import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PerformanceAnalyticsLoading() {
  return (
    <PageWrapper
      title="Performance Analytics"
      subtitle="Review cycle insights and metrics"
      actions={<Skeleton className="h-9 w-24 rounded-md" />}
    >
      <div className="space-y-5">
        <StatCardGridSkeleton cols={4} count={4} />
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-4 px-6 py-3 border-b bg-muted/30">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24 ml-auto" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b last:border-b-0">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24 ml-auto" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
