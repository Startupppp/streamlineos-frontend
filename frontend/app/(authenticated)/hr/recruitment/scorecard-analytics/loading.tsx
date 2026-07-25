import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function ScorecardAnalyticsLoading() {
  return (
    <PageWrapper
      title="Scorecard Analytics"
      subtitle="Interviewer performance and scoring patterns"
    >
      <StatCardGridSkeleton cols={3} count={3} className="mb-4" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </PageWrapper>
  );
}
