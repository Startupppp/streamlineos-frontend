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
          {["All", "Running", "Completed", "Failed", "Pending", "Cancelled"].map((label, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-md" />
          ))}
        </div>
      }
    >
      <div className="rounded-xl border border-border bg-card">
        <div className="grid px-4 py-2.5 border-b border-border" style={{ gridTemplateColumns: "2fr 1fr 1fr 1.5fr 1fr auto" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-20" />
          ))}
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="grid items-center px-4 py-3 gap-4" style={{ gridTemplateColumns: "2fr 1fr 1fr 1.5fr 1fr auto" }}>
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
