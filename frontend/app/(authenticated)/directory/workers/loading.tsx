import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function WorkersLoading() {
  return (
    <PageWrapper
      title="Workforce"
      subtitle="Workers and engagements"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 min-w-0 flex-1" />
          <Skeleton className="hidden h-9 w-[130px] shrink-0 sm:block" />
        </div>
      }
      actions={<Skeleton className="h-9 w-24 max-w-full sm:w-28" />}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        <DataTableSkeleton
          rows={12}
          columns={6}
          mobileCards
          className="min-w-0 flex-1"
        />
      </div>
    </PageWrapper>
  );
}
