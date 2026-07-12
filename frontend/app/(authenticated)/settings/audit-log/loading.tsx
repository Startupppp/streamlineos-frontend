import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuditLogLoading() {
  const filtersBar = (
    <div className="flex flex-wrap gap-2 items-end">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1 min-w-[140px] flex-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
      ))}
    </div>
  );

  return (
    <PageWrapper
      title="Audit Log"
      subtitle="Track all system actions, logins, and changes across your organization."
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
      }
      filters={filtersBar}
    >
      <DataTableSkeleton rows={15} columns={6} />
    </PageWrapper>
  );
}
