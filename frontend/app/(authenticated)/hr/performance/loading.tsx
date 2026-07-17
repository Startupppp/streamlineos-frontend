import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function PerformanceLoading() {
  return (
    <PageWrapper title="Performance" subtitle="Reviews, goals, and team development">
      <div className="flex flex-col flex-1 min-h-0 gap-0">
        <div className="flex gap-0 border-b border-border overflow-x-auto scrollbar-none shrink-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 mx-1.5 my-1 rounded-none shrink-0" />
          ))}
        </div>
        <div className="flex-1 pt-4 space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
