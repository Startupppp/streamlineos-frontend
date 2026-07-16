import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function WorkforceCostLoading() {
  return (
    <PageWrapper
      title="Workforce Costing"
      subtitle="Real-time cost breakdown by department and location"
    >
      <div className="space-y-5">
        <StatCardGridSkeleton cols={3} count={3} />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[240px] rounded-xl" />
          <Skeleton className="h-[240px] rounded-xl" />
        </div>
      </div>
    </PageWrapper>
  );
}
