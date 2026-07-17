import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function CycleCountsLoading() {
  return (
    <PageWrapper
      title="Cycle Counts"
      subtitle="Count inventory by location or category to verify stock accuracy."
      actions={<Skeleton className="h-9 w-36" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-[160px]" />
        </div>
      }
    >
      <DataTableSkeleton rows={10} columns={8} className="flex-1 min-h-0" />
    </PageWrapper>
  );
}
