import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function DirectoryLoading() {
  return (
    <PageWrapper
      title="People"
      subtitle="Everyone in your organization"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 flex-1 min-w-[12rem] rounded-md" />
        </div>
      }
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <DataTableSkeleton rows={12} columns={5} />
    </PageWrapper>
  );
}
