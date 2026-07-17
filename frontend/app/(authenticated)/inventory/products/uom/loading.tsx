import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function UomLoading() {
  return (
    <PageWrapper
      title="Units of Measure"
      subtitle="Define units used across product catalogues and transactions."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 flex-1 max-w-[384px]" />
          <Skeleton className="h-9 w-[140px]" />
        </div>
      }
    >
      <div className="space-y-4 flex-1 min-h-0 flex flex-col">
        <Skeleton className="h-48 w-full rounded-xl" />
        <DataTableSkeleton rows={8} columns={5} className="flex-1 min-h-0" />
      </div>
    </PageWrapper>
  );
}
