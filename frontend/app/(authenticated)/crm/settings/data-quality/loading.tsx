import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function CrmDataQualityLoading() {
  return (
    <PageWrapper title="Data Quality" subtitle="CRM data health overview">
      <div className="space-y-4">
        <StatCardGridSkeleton cols={4} count={4} />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </PageWrapper>
  );
}
