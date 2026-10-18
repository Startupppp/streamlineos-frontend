import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function PrivacyLoading() {
  return (
    <PageWrapper
      title="Privacy requests"
      subtitle="Export or erase member data, and run subject-access requests."
      noInternalScroll
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <Skeleton className="mb-4 h-9 w-full shrink-0 rounded-lg md:w-72" />
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-9 w-full sm:max-w-sm" />
            <Skeleton className="h-9 w-full sm:w-32" />
          </div>
          <DataTableSkeleton
            fill
            headers={["Request", "Subject", "Status", "Records", "Requested", "Due"]}
          />
        </div>
      </div>
    </PageWrapper>
  );
}
