import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
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
      <div className="space-y-4">
        <DataTableSkeleton rows={10} columns={6} />
      </div>
    </PageWrapper>
  );
}
