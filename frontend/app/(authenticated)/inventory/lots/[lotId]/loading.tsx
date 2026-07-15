import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function LotDetailLoading() {
  return (
    <PageWrapper backHref="/inventory/lots" title="Loading…">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-28" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <div className="rounded-md border border-border bg-card overflow-hidden">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="border-b border-border/50 px-2 py-1.5 flex gap-4">
                {Array.from({ length: 12 }).map((__, j) => (
                  <Skeleton key={j} className="h-3 w-20" />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <div className="rounded-md border border-border bg-card overflow-hidden">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="border-b border-border/50 px-2 py-1.5 flex gap-4">
                {Array.from({ length: 12 }).map((__, j) => (
                  <Skeleton key={j} className="h-3 w-16" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
