import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function UsersLoading() {
  return (
    <PageWrapper
      title="Members & access"
      subtitle="Manage people who can sign in, their roles, and organization access."
      actions={
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      }
      filters={
        <div className="flex w-full min-w-0 flex-col gap-2 lg:flex-row lg:flex-nowrap lg:items-center lg:justify-between">
          <Skeleton className="h-9 w-56 rounded-lg shrink-0" />
          <div className="flex min-w-0 items-center gap-2">
            <Skeleton className="h-9 flex-1 max-w-[320px]" />
            <Skeleton className="h-9 w-28 shrink-0" />
            <Skeleton className="h-9 w-28 shrink-0" />
            <Skeleton className="h-9 w-28 shrink-0" />
            <Skeleton className="h-9 w-28 shrink-0" />
          </div>
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-3">
        <StatCardGridSkeleton cols={5} count={5} />
        <DataTableSkeleton rows={12} columns={9} />
      </div>
    </PageWrapper>
  );
}
