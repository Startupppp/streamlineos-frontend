import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function QualityHubLoading() {
  return (
    <PageWrapper
      title="Quality Hub"
      subtitle="Overview of inspections, holds, and recalls"
    >
      <StatCardGridSkeleton cols={4} count={4} />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-[150px]" />
        <Skeleton className="h-9 w-[130px]" />
        <Skeleton className="h-9 w-[130px]" />
      </div>
      <DataTableSkeleton rows={5} columns={4} className="flex-1 min-h-0" />
    </PageWrapper>
  );
}
