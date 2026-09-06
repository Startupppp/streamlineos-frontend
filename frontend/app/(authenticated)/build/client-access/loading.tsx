import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function BuildClientAccessLoading() {
  return (
    <PageWrapper
      title="Client Access"
      subtitle="Grant clients visibility into project progress"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 min-w-[12rem] flex-1 rounded-md" />
        </div>
      }
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <DataTableSkeleton rows={12} columns={5} />
    </PageWrapper>
  );
}
