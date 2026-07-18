import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function ProductDetailLoading() {
  return (
    <PageWrapper
      title="Product"
      subtitle="Loading..."
      actions={<Skeleton className="h-9 w-28" />}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <StatCardGridSkeleton cols={4} count={4} />
        <DataTableSkeleton rows={6} className="flex-1 min-h-0" />
      </div>
    </PageWrapper>
  );
}
