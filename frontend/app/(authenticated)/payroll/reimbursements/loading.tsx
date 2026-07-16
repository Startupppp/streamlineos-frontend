import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export function ReimbursementsPageSkeleton() {
  return (
    <PageWrapper
      title="Reimbursements"
      subtitle="Review and approve employee expense claims."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-44 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-44 rounded-md" />
        </div>
      }
    >
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-2.5 flex gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-20" />
            ))}
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-4 py-3 items-center">
                <div className="flex flex-col gap-1 flex-1">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2.5 w-36" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

export default function Loading() {
  return <ReimbursementsPageSkeleton />;
}
