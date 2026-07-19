import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function CarriersLoading() {
  return (
    <PageWrapper
      title="Carriers"
      subtitle="Manage shipping carriers and tracking"
      actions={<Skeleton className="h-9 w-28" />}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <DataTableSkeleton rows={10} />
      </div>
    </PageWrapper>
  );
}
