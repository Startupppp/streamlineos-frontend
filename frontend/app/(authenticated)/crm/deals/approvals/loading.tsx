import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function DealApprovalsLoading() {
  return (
    <PageWrapper
      title="Deal Approvals"
      subtitle="Review and approve high-value deals"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-[160px] rounded-md" />
        </div>
      }
    >
      <DataTableSkeleton rows={12} columns={7} />
    </PageWrapper>
  );
}
