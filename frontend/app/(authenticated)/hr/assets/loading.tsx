import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function HrAssetsLoading() {
  return (
    <PageWrapper
      title="Assets & Devices"
      subtitle="Register company assets and manage employee assignments"
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-[130px] rounded-md" />
        </div>
      }
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-[148px] rounded-md" />
          <Skeleton className="h-9 w-[140px] rounded-md" />
          <Skeleton className="h-9 w-[148px] rounded-md" />
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col space-y-4">
        <StatCardGridSkeleton cols={4} count={4} />
        <DataTableSkeleton rows={10} columns={7} className="flex-1 min-h-0" />
      </div>
    </PageWrapper>
  );
}
