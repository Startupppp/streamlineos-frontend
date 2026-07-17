import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function PackagesLoading() {
  return (
    <PageWrapper
      title="Packages"
      subtitle="Manage shipping packages"
      actions={<Skeleton className="h-9 w-32" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-[160px]" />
        </div>
      }
    >
      <DataTableSkeleton rows={10} columns={5} className="flex-1 min-h-0" />
    </PageWrapper>
  );
}
