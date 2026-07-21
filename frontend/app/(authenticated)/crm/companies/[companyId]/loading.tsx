import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function CompanyDetailLoading() {
  return (
    <PageWrapper title="Company" subtitle="Loading..." backHref="/crm/companies">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <StatCardGridSkeleton cols={4} count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-40" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-40" />
          </div>
        </div>
        <Skeleton className="h-48" />
      </div>
    </PageWrapper>
  );
}
