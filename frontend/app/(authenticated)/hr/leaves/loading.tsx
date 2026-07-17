import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LeavesLoading() {
  return (
    <PageWrapper
      title="Leaves & Time Off"
      subtitle="Manage your leave requests, work from home, and approvals."
    >
      <div className="space-y-4">
        <StatCardGridSkeleton cols={3} count={3} />
        <Skeleton className="h-64" />
      </div>
    </PageWrapper>
  );
}
