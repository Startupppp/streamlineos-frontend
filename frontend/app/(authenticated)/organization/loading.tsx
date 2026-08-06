import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function OrganizationLoading() {
  return (
    <PageWrapper
      title="Organization Structure"
      subtitle="Set up reporting units once, then reuse them across people, access, payroll, and reporting."
    >
      <div className="space-y-4">
        <StatCardGridSkeleton cols={6} count={6} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Skeleton className="h-64 w-full rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-36 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </div>
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </PageWrapper>
  );
}
