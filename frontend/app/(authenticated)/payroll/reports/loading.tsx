import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export function ReportsPageSkeleton() {
  return (
    <PageWrapper
      title="Payroll Reports"
      subtitle="Loading reports…"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-44 rounded-md" />
          <Skeleton className="h-9 w-40 rounded-md" />
          <Skeleton className="h-9 w-40 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      }
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:gap-6">
        <div className="hidden lg:flex w-52 shrink-0 flex-col gap-1">
          {Array.from({ length: 11 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    </PageWrapper>
  );
}

export default function Loading() {
  return <ReportsPageSkeleton />;
}
