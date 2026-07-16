import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function CrmTasksLoading() {
  return (
    <PageWrapper
      title="Tasks"
      subtitle="Follow-ups and action items across your pipeline"
      actions={<Skeleton className="h-9 w-24 rounded-md" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-[180px] rounded-md" />
          <Skeleton className="h-9 w-[110px] rounded-md" />
          <Skeleton className="h-9 w-[110px] rounded-md" />
          <Skeleton className="h-9 w-[110px] rounded-md" />
          <Skeleton className="h-9 w-[130px] rounded-md" />
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col space-y-4">
        <StatCardGridSkeleton cols={5} count={5} />

        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-md border border-border overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-muted/30">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-8 rounded-full" />
              </div>
              <div className="divide-y divide-border/50">
                {Array.from({ length: 8 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 flex-1 max-w-xs" />
                    <Skeleton className="h-3 w-16 ml-auto" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
