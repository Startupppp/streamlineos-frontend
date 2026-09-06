import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function LeadDistributionLoading() {
  return (
    <PageWrapper
      title="Lead Distribution"
      subtitle="Upload leads and distribute to your sales team via round-robin"
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      }
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-[240px] rounded-md" />
          <Skeleton className="h-9 w-[120px] rounded-md" />
        </div>
      }
    >
      <div className="space-y-4">
        <StatCardGridSkeleton cols={3} count={3} />
        <DataTableSkeleton rows={12} columns={6} />
      </div>
    </PageWrapper>
  );
}
