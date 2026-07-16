import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function LoadsLoading() {
  return (
    <PageWrapper
      title="Loads"
      subtitle="Group shipments into transport loads"
      actions={<Skeleton className="h-9 w-28" />}
    >
      <DataTableSkeleton rows={10} className="flex-1 min-h-0" />
    </PageWrapper>
  );
}
