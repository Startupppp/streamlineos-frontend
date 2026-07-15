import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function CycleCountDetailLoading() {
  return (
    <PageWrapper title="Cycle Count" backHref="/inventory/cycle-counts">
      <div className="grid grid-cols-3 gap-3 mb-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-28" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="h-10 bg-muted/30 border-b border-border" />
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-10 border-t border-border flex items-center px-4 gap-3">
            <Skeleton className="h-3 w-32 flex-1" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
