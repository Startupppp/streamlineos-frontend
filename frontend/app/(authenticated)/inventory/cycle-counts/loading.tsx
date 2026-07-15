import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function CycleCountsLoading() {
  return (
    <PageWrapper
      title="Cycle Counts"
      subtitle="Count inventory by location or category to verify stock accuracy."
    >
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="h-10 bg-muted/30 border-b border-border" />
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-10 border-t border-border flex items-center px-4 gap-3">
            <Skeleton className="h-3 w-24 font-mono" />
            <Skeleton className="h-3 w-28 flex-1" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-7 rounded-md" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
