import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function LotsLoading() {
  return (
    <PageWrapper
      title="Lots"
      subtitle="Track lot numbers, expiry dates, and stock by lot."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-[140px]" />
          <Skeleton className="h-9 w-[170px]" />
        </div>
      }
    >
      <DataTableSkeleton rows={10} columns={8} className="flex-1 min-h-0" />
    </PageWrapper>
  );
}
