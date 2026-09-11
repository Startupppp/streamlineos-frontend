import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function TimesheetExceptionsLoading() {
  return (
    <PageWrapper
      title="Exceptions"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-40 rounded-md" />
        </div>
      }
    >
      <div className="space-y-4">
        <StatCardGridSkeleton cols={4} count={4} />
        <DataTableSkeleton rows={12} columns={7} />
      </div>
    </PageWrapper>
  );
}
