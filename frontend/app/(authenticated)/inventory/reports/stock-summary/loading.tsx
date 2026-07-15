import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function StockSummaryLoading() {
  return (
    <PageWrapper title="Stock Summary">
      <div className="flex flex-nowrap items-center gap-2 mb-4 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
        <Skeleton className="h-8 w-64 flex-1 max-w-xs" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-24 ml-auto" />
      </div>
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="bg-muted/80" />
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="border-t border-border flex items-center px-2 gap-3">
            <Skeleton className="h-3 w-32 flex-1" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-14 rounded" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
