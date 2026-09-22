import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function DocumentReviewLoading() {
  return (
    <PageWrapper
      title="Document Review"
      subtitle="Review employee onboarding documents"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-[200px] rounded-md" />
          <Skeleton className="h-9 w-[140px] rounded-md" />
        </div>
      }
    >
      <DataTableSkeleton rows={12} headers={["Employee", "Progress", "Status", "Actions"]} className="flex-1 min-h-0" />
    </PageWrapper>
  );
}
