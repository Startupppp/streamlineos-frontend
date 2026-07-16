import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function GoalsLoading() {
  return (
    <PageWrapper
      title="Goals & OKRs"
      subtitle="Track your personal and team goals"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-64 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full rounded-full" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
