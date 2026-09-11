import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function TerritoriesLoading() {
  return (
    <PageWrapper
      title="Territories"
      subtitle="Geographic and segmentation territories for lead and deal routing"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <div className="space-y-4">
        <DataTableSkeleton rows={10} columns={5} />
        <div className="bg-card rounded-lg border border-border shadow-sm p-4 space-y-3">
          <Skeleton className="h-4 w-40" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-9 rounded-md" />
            <Skeleton className="h-9 rounded-md" />
            <Skeleton className="h-9 rounded-md" />
            <Skeleton className="h-9 rounded-md" />
          </div>
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>
    </PageWrapper>
  );
}
