import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function CyclesLoading() {
  return (
    <PageWrapper title="Cycles">
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-3 w-12" />
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-14 rounded-full" />
            </div>
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="border-t border-border" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-44" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-14 rounded-full" />
                <Skeleton className="h-4 w-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
