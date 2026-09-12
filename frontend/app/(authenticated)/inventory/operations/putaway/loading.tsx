import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function PutawayWorkbenchLoading() {
  return (
    <PageWrapper
      title="Putaway"
      subtitle="Deliveries waiting to move from the dock to the shelves."
      actions={<Skeleton className="h-9 w-full sm:w-36" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-56 rounded-lg" />
          <Skeleton className="h-9 w-40" />
        </div>
      }
      noInternalScroll
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <DataTableSkeleton rows={10} columns={8} className="flex-1 min-h-0" />
    </PageWrapper>
  );
}
