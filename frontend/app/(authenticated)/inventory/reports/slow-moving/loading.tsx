import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function SlowMovingReportLoading() {
  return (
    <PageWrapper
      title="Slow-Moving Inventory"
      subtitle="Products with stock on hand but no outbound activity within the selected window"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-[180px]" />
          <Skeleton className="h-9 w-32" />
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <DataTableSkeleton rows={10} columns={6} />
      </div>
    </PageWrapper>
  );
}
