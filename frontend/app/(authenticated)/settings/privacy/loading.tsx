import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function PrivacyLoading() {
  return (
    <PageWrapper
      title="Privacy requests"
      subtitle="Data-subject access and erasure requests."
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <section className="flex shrink-0 flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="space-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-72" />
          </div>
          <Skeleton className="h-9 w-full sm:max-w-sm" />
        </section>

        <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-9 w-32" />
          </div>
          <Skeleton className="h-9 w-full shrink-0 sm:max-w-sm" />
          <DataTableSkeleton
            fill
            headers={["Request", "Subject", "Status", "Records", "Requested", "Due"]}
          />
        </section>
      </div>
    </PageWrapper>
  );
}
