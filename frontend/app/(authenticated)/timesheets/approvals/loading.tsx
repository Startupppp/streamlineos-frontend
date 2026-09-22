import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function TimesheetApprovalsLoading() {
  return (
    <PageWrapper
      title="Approvals"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-44 rounded-md" />
          <Skeleton className="h-9 w-64 rounded-md" />
        </div>
      }
    >
      <DataTableSkeleton rows={12} headers={["Member", "Period", "Hours", "Billable", "Submitted", "Approver", "Status"]} />
    </PageWrapper>
  );
}
