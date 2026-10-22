import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function TravelApprovalsLoading() {
  return (
    <PageWrapper
      title="Travel Approvals"
      subtitle="Review and approve pending travel requests"
    >
      <div className="space-y-4">
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-48 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
        <DataTableSkeleton columns={5} rows={8} />
      </div>
    </PageWrapper>
  );
}
