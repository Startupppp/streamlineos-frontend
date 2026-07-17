import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function RecallsLoading() {
  return (
    <PageWrapper
      title="Recalls"
      subtitle="Manage product recalls"
      actions={<Skeleton className="h-9 w-32" />}
    >
      <DataTableSkeleton rows={10} columns={5} className="flex-1 min-h-0" />
    </PageWrapper>
  );
}
