import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function MyTeamLoading() {
  return (
    <PageWrapper variant="display" title="My team">
      <div className="flex min-h-0 flex-1 flex-col gap-4" role="status" aria-label="Loading my team">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
        <StatCardGridSkeleton cols={3} count={3} />
      </div>
    </PageWrapper>
  );
}
