import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function RostersLoading() {
  return (
    <PageWrapper
      title="Rosters"
      subtitle="Weekly scheduling grid for your team"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <DataTableSkeleton rows={8} columns={7} />
    </PageWrapper>
  );
}
