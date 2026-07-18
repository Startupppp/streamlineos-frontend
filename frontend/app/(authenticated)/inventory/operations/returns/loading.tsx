import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function ReturnsLoading() {
  return (
    <PageWrapper
      title="Returns"
      subtitle="Manage vendor and customer returns"
      actions={<Skeleton className="h-9 w-32" />}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-[240px]" />
        </div>
        <DataTableSkeleton rows={8} columns={5} className="flex-1 min-h-0" />
      </div>
    </PageWrapper>
  );
}
