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
          <Skeleton className="h-9 min-w-[12rem] flex-1 rounded-md" />
          <Skeleton className="h-9 w-[130px] shrink-0 rounded-md" />
        </div>
      }
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <DataTableSkeleton rows={12} columns={6} />
    </PageWrapper>
  );
}
