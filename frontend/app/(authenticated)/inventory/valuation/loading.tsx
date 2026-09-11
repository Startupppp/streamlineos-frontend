import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function ValuationLoading() {
  return (
    <PageWrapper
      title="Inventory Valuation"
      subtitle="Total stock value by costing method."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 flex-1 max-w-md" />
          <Skeleton className="h-9 w-[160px]" />
        </div>
      }
      actions={<Skeleton className="h-9 w-32" />}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <StatCardGridSkeleton cols={4} count={4} />
        <DataTableSkeleton rows={10} columns={7} />
      </div>
    </PageWrapper>
  );
}
