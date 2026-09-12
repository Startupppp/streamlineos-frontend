import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function TransferRecommendationsLoading() {
  return (
    <PageWrapper
      title="Transfer recommendations"
      subtitle="Where one site is short and another has genuine spare, measured in weeks of cover rather than units."
      filters={<Skeleton className="h-9 min-w-0 flex-1 lg:max-w-md" />}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <StatCardGridSkeleton cols={3} count={3} />
        <DataTableSkeleton rows={10} columns={5} />
      </div>
    </PageWrapper>
  );
}
