import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function ReorderReportLoading() {
  return (
    <PageWrapper
      title="Reorder Report"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 flex-1 max-w-md" />
          <Skeleton className="h-9 w-32" />
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <StatCardGridSkeleton cols={3} count={3} />
        <DataTableSkeleton rows={10} columns={9} className="flex-1 min-h-0" />
      </div>
    </PageWrapper>
  );
}
