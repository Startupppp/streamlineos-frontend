import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function PurchaseOrdersLoading() {
  return (
    <PageWrapper
      title="Purchase Orders"
      subtitle="Track and manage orders sent to your suppliers."
      actions={<Skeleton className="h-9 w-24" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 flex-1 max-w-[448px]" />
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
        </div>
      }
    >
      <DataTableSkeleton rows={10} columns={7} className="flex-1 min-h-0" />
    </PageWrapper>
  );
}
