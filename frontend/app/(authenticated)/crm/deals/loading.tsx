import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function DealsLoading() {
  return (
    <PageWrapper
      title="Deals Pipeline"
      subtitle="Track and manage your deals across stages"
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      }
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-[200px] rounded-md" />
          <Skeleton className="h-9 w-[140px] rounded-md" />
          <Skeleton className="h-9 w-[140px] rounded-md" />
          <Skeleton className="h-9 w-[74px] rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col space-y-4">
        <div className="shrink-0">
          <StatCardGridSkeleton cols={4} count={4} />
        </div>
        <DataTableSkeleton rows={12} columns={5} />
      </div>
    </PageWrapper>
  );
}
