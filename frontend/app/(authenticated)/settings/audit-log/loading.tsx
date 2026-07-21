import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuditLogLoading() {
  return (
    <PageWrapper
      title="Audit Log"
      subtitle="Track all system actions, logins, and changes across your organization."
      mobileFiltersInline
      filters={
        <>
          <Skeleton className="h-9 w-[5.5rem] shrink-0 rounded-md md:hidden" />
          <div className="min-w-0 flex-1 md:min-w-[160px] md:max-w-xs">
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
          <Skeleton className="hidden h-9 w-[130px] rounded-md md:block" />
          <Skeleton className="hidden h-9 w-[140px] rounded-md md:block" />
          <Skeleton className="hidden h-9 w-[140px] rounded-md md:block" />
        </>
      }
    >
      <DataTableSkeleton rows={15} columns={6} />
    </PageWrapper>
  );
}
