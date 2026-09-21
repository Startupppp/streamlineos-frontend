import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function WorkforceCostLoading() {
  return (
    <PageWrapper
      title="Workforce costing"
      subtitle="Real-time cost breakdown by department and location"
    >
      <div className="space-y-6">
        <StatCardGridSkeleton cols={3} count={3} />
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-16 rounded-md" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border bg-card p-4 space-y-2">
            <Skeleton className="h-4 w-40 mb-3" />
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
          <div className="rounded-xl border bg-card p-4 space-y-2">
            <Skeleton className="h-4 w-32 mb-3" />
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
