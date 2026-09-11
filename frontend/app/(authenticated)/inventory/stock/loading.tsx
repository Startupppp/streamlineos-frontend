import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function StockLoading() {
  return (
    <PageWrapper
      title="Stock Levels"
      subtitle="Live stock levels across all warehouses."
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-9 w-[130px]" />
        </div>
      }
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 flex-1 max-w-[320px]" />
          <Skeleton className="h-9 w-[160px]" />
          <Skeleton className="h-9 w-[160px]" />
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <DataTableSkeleton rows={12} columns={12} />
      </div>
    </PageWrapper>
  );
}
