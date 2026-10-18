import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
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
          <Skeleton className="h-9 w-full rounded-lg lg:w-56 lg:shrink-0" />
          <div className="flex min-w-0 items-center gap-2">
            <Skeleton className="h-9 max-w-[320px] flex-1" />
            <Skeleton className="h-9 w-9 shrink-0" />
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <StatCardGridSkeleton cols={5} count={5} />
        <DataTableSkeleton columns={8} />
      </div>
    </PageWrapper>
  );
}
