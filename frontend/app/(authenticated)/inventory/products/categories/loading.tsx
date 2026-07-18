import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function CategoriesLoading() {
  return (
    <PageWrapper
      title="Categories"
      subtitle="Organise products into categories and sub-categories."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 flex-1 max-w-[384px]" />
          <Skeleton className="h-9 w-[140px]" />
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <Skeleton className="h-48 w-full rounded-xl" />
        <DataTableSkeleton rows={8} className="flex-1 min-h-0" />
      </div>
    </PageWrapper>
  );
}
