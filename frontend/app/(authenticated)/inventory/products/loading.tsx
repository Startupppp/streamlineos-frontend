import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function ProductsLoading() {
  return (
    <PageWrapper
      title="Products"
      subtitle="Manage your product catalogue"
      actions={<Skeleton className="h-9 w-28" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 flex-1 max-w-[448px]" />
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <DataTableSkeleton rows={10} columns={10} />
      </div>
    </PageWrapper>
  );
}
