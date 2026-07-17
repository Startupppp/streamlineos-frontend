import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LearningAnalyticsLoading() {
  return (
    <PageWrapper
      title="Learning Analytics"
      subtitle="Track your learning progress and course completion"
      actions={<Skeleton className="h-9 w-40 rounded-md" />}
    >
      <div className="space-y-5">
        <StatCardGridSkeleton cols={4} count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Skeleton className="h-[280px] rounded-lg" />
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <Skeleton className="h-4 w-40" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-5 w-8 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
