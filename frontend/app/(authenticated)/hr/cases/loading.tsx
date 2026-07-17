import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function HrCasesLoading() {
  return (
    <PageWrapper
      title="Employee Relations & Cases"
      subtitle="Manage grievances, investigations, and disciplinary actions"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-48 rounded-md" />
          <Skeleton className="h-9 w-44 rounded-md" />
          <Skeleton className="h-9 w-44 rounded-md" />
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-36 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      }
    >
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        <div className="flex items-center gap-1 border-b pb-0">
          <Skeleton className="h-8 w-16 rounded-none" />
          <Skeleton className="h-8 w-36 rounded-none" />
        </div>
        <DataTableSkeleton rows={12} columns={6} />
      </div>
    </PageWrapper>
  );
}
