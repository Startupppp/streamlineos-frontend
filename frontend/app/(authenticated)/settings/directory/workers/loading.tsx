import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function WorkersLoading() {
  return (
    <PageWrapper
      title="Workforce"
      subtitle="Workers and engagements"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-[130px]" />
        </div>
      }
      actions={<Skeleton className="h-9 w-28" />}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <DataTableSkeleton rows={12} columns={6} className="flex-1" />
      </div>
    </PageWrapper>
  );
}
