import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function TimesheetOverdueLoading() {
  return (
    <PageWrapper
      title="Overdue"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-44 rounded-md" />
          <Skeleton className="h-9 w-40 rounded-md" />
        </div>
      }
    >
      <DataTableSkeleton rows={10} headers={["Member", "Period", "Status", "Days overdue", "Approver"]} />
    </PageWrapper>
  );
}
