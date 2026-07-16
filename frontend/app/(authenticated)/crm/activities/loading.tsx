import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function CrmActivitiesLoading() {
  return (
    <PageWrapper
      title="Activities"
      subtitle="Track calls, emails, meetings, and tasks across your pipeline"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-[200px] rounded-md" />
          <Skeleton className="h-9 w-[120px] rounded-md" />
          <Skeleton className="h-9 w-[120px] rounded-md" />
          <Skeleton className="h-9 w-[120px] rounded-md" />
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col space-y-4">
        <StatCardGridSkeleton cols={5} count={5} />

        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="bg-card rounded-xl border border-border p-4 space-y-2"
            >
              <div className="flex items-start gap-3">
                <Skeleton className="h-5 w-16 rounded-full shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-20 shrink-0" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
