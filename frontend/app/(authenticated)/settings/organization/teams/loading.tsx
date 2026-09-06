import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function TeamsLoading() {
  return (
    <PageWrapper
      title="Teams"
      subtitle="Teams within departments."
      actions={
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      }
      filters={<Skeleton className="h-9 w-full max-w-[320px]" />}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <DataTableSkeleton rows={12} columns={6} />
      </div>
    </PageWrapper>
  );
}
