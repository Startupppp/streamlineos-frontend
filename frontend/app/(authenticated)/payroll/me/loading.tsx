import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyPayrollLoading() {
  return (
    <PageWrapper title="My Payroll" subtitle="Loading…">
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5">
              <Skeleton className="h-8 w-8 rounded-md shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          ))}
        </div>

        <Skeleton className="h-9 w-full rounded-none -mx-px" />

        <div className="space-y-8">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                {Array.from({ length: 9 }).map((_, j) => (
                  <div key={j} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-24 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
