import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function TransfersLoading() {
  return (
    <PageWrapper
      title="Stock Transfers"
      subtitle="Move stock between warehouse locations"
      actions={<Skeleton className="h-9 w-32" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-[140px]" />
          <Skeleton className="h-9 w-[160px]" />
          <Skeleton className="h-9 w-[160px]" />
          <Skeleton className="h-9 w-[180px]" />
        </div>
      }
    >
      <DataTableSkeleton rows={10} columns={7} className="flex-1 min-h-0" />
    </PageWrapper>
  );
}
