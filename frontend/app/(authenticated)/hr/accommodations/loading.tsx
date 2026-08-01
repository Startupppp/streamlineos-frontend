import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function HrAccommodationsLoading() {
  return (
    <PageWrapper
      title="Accommodations"
      subtitle="Manage workplace accommodation requests"
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-44 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      }
    >
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        <DataTableSkeleton rows={10} columns={5} />
      </div>
    </PageWrapper>
  );
}
