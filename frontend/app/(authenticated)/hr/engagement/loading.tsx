import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";

const FILTER_PILLS = [1, 2, 3, 4, 5, 6];

export default function HrEngagementLoading() {
  return (
    <PageWrapper title="Engagement" subtitle="Track employee engagement, mood, and recognition">
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {FILTER_PILLS.map((n) => (
            <Skeleton key={n} className="h-7 w-24 rounded-full" />
          ))}
        </div>
        <StatCardGridSkeleton cols={4} count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    </PageWrapper>
  );
}
