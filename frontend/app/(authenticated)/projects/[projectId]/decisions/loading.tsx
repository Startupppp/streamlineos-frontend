import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectDecisionsLoading() {
  return (
    <PageWrapper
      title="Decisions Log"
      actions={<Skeleton className="h-8 w-36 rounded-md" />}
      filters={
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-40 rounded-md" />
          <Skeleton className="h-8 w-52 rounded-md" />
        </div>
      }
    >
      <div className="px-4 pb-4">
        <DataTableSkeleton rows={12} columns={7} />
      </div>
    </PageWrapper>
  );
}
