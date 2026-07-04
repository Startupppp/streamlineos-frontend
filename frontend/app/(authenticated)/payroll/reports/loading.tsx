import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export function ReportsPageSkeleton() {
  return (
    <PageWrapper title="Payroll Reports" eyebrow="Payroll">
      <div className="flex flex-col gap-3 lg:flex-row lg:gap-6">
        <div className="hidden lg:flex w-52 shrink-0 flex-col gap-1">
          {Array.from({ length: 11 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded" />
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
