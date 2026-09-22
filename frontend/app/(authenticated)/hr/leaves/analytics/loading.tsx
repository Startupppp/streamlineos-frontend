import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LeaveAnalyticsLoading() {
  return (
    <PageWrapper
      title="Leave Analytics"
      subtitle="Summary from People analytics"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <div className="space-y-6">
        <StatCardGridSkeleton cols={3} count={3} />
        <Skeleton className="h-[200px] rounded-2xl" />
        <Skeleton className="h-[160px] rounded-2xl" />
      </div>
    </PageWrapper>
  );
}
