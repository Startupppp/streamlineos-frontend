import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function HrSafetyLoading() {
  return (
    <PageWrapper
      title="Health, Safety & Wellness"
      subtitle="Track workplace incidents and monitor employee wellbeing"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-44 rounded-md" />
          <Skeleton className="h-9 w-40 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      }
    >
      <div className="rounded-xl border border-border bg-card overflow-hidden flex-1">
        <div className="flex items-center gap-4 px-6 py-3 border-b bg-muted/30">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24 ml-auto" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b last:border-b-0">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-24 ml-auto" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
