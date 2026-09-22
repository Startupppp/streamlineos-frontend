import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function KbLoading() {
  return (
    <PageWrapper title="Knowledge Base">
      <div className="flex flex-1 min-h-0 flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-3 rounded-xl border border-border bg-card">
              <div className="flex items-start gap-3">
                <Skeleton className="h-5 w-5 shrink-0 rounded" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-card">
              <Skeleton className="h-4 w-4 shrink-0 rounded" />
              <Skeleton className="h-3.5 flex-1 max-w-xs" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
