import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReorderReportLoading() {
  return (
    <PageWrapper eyebrow="Inventory · Reports" title="Reorder Report">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Skeleton className="h-8 w-64 flex-1" />
        <Skeleton className="h-8 w-28 ml-auto" />
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="h-8 bg-muted/80" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-8 border-t border-border flex items-center px-2 gap-3">
            <Skeleton className="h-3 w-32 flex-1" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-16 rounded" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
