import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function ExecutionsLoading() {
  return (
    <PageWrapper
      title="Execution Monitor"
      subtitle="Track real-time and historical workflow execution status."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-[160px] rounded-md" />
        </div>
      }
    >
      <div className="rounded-xl border border-border bg-card">
        <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr_auto] gap-4 px-4 py-2.5 border-b border-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-20" />
          ))}
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr_auto] items-center gap-4 px-4 py-3"
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
