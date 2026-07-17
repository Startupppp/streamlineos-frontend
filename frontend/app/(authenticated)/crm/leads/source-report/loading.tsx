import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function LeadSourceReportLoading() {
  return (
    <PageWrapper title="Lead Source Report" subtitle="Attribution analysis across all lead sources">
      <div className="space-y-6">
        <StatCardGridSkeleton cols={4} count={5} />
        <Skeleton className="h-80" />
      </div>
    </PageWrapper>
  );
}
