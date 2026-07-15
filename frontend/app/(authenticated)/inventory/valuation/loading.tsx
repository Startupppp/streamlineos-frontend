import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ValuationLoading() {
  return (
    <PageWrapper title="Inventory Valuation" subtitle="Total stock value by costing method.">
      <div className="grid grid-cols-4 gap-3 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-28" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="h-10 bg-muted/30 border-b border-border" />
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-12 border-t border-border flex items-center px-4 gap-4">
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
