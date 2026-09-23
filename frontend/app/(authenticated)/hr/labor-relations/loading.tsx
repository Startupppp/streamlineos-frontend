import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function HrLaborRelationsLoading() {
  return (
    <PageWrapper
      title="Labor Relations"
      subtitle="Manage union memberships, collective agreements, and labor disputes."
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-44 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      }
    >
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        <div className="flex items-center gap-1 border-b">
          <Skeleton className="h-9 w-24 rounded-none" />
          <Skeleton className="h-9 w-32 rounded-none" />
          <Skeleton className="h-9 w-28 rounded-none" />
        </div>
        <DataTableSkeleton rows={10} headers={["User", "Union", "Since", "Status", ""]} />
      </div>
    </PageWrapper>
  );
}
