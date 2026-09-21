import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function HrEventStreamLoading() {
  return (
    <PageWrapper
      title="HR audit log"
      subtitle="Immutable append-only log of all HR domain events"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-48 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      }
    >
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        <DataTableSkeleton rows={12} columns={5} />
      </div>
    </PageWrapper>
  );
}
