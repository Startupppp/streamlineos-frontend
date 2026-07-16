import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function DealApprovalsLoading() {
  return (
    <PageWrapper
      title="Deal Approvals"
      subtitle="Review and approve high-value deals"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-md" />
          ))}
        </div>
      }
    >
      <DataTableSkeleton rows={12} columns={6} />
    </PageWrapper>
  );
}
