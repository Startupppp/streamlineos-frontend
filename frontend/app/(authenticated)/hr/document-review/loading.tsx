import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function DocumentReviewLoading() {
  return (
    <PageWrapper
      title="Document Review"
      subtitle="Review employee onboarding documents"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-[200px] rounded-md" />
          <Skeleton className="h-9 w-[140px] rounded-md" />
        </div>
      }
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="rounded-xl border border-border bg-card overflow-hidden flex-1">
          <div className="flex items-center gap-4 px-6 py-3 border-b bg-muted/30">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24 ml-auto" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b last:border-b-0">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="flex-1 ml-4">
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-9 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
