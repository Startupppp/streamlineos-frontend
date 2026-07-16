import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function MovementsReportLoading() {
  return (
    <PageWrapper
      title="Stock Movements"
      subtitle="Full audit trail of all inventory movements — receipts, shipments, adjustments, and transfers."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-[180px]" />
          <Skeleton className="h-9 w-[160px]" />
          <Skeleton className="h-9 w-[160px]" />
          <Skeleton className="h-9 w-[160px]" />
        </div>
      }
      actions={<Skeleton className="h-9 w-32" />}
    >
      <DataTableSkeleton rows={10} className="flex-1 min-h-0" />
    </PageWrapper>
  );
}
