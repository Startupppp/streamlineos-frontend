import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export function SalaryStructuresSkeleton() {
  return (
    <PageWrapper
      title="Salary Structure Templates"
      subtitle="Reusable compensation templates applied to employee profiles."
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-12 rounded-lg" />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <div className="flex gap-1">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}

export default function Loading() {
  return <SalaryStructuresSkeleton />;
}
