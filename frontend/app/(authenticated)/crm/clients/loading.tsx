import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function ClientsLoading() {
  return (
    <PageWrapper
      title="Clients"
      subtitle="Client accounts"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-[240px] rounded-md" />
          <Skeleton className="h-9 w-[160px] rounded-md" />
        </div>
      }
    >
      <DataTableSkeleton rows={12} columns={8} className="flex-1" />
    </PageWrapper>
  );
}
