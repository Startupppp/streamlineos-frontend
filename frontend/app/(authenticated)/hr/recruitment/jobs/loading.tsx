import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function JobsLoading() {
  return (
    <PageWrapper
      title="Job Postings"
      subtitle="Manage open positions"
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      }
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-[130px] rounded-md" />
          <Skeleton className="h-9 w-[140px] rounded-md" />
        </div>
      }
    >
      <div className="space-y-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
