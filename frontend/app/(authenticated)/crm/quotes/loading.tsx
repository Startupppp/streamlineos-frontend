import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function QuotesLoading() {
  return (
    <PageWrapper
      title="Quotes"
      subtitle="Quote management"
      noInternalScroll
      contentClassName="flex flex-col"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 flex-1 max-w-[240px] rounded-md" />
          <Skeleton className="h-9 w-[140px] rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md ml-auto" />
        </div>
      }
    >
      <DataTableSkeleton rows={12} columns={8} className="flex-1 min-h-0" />
    </PageWrapper>
  );
}
