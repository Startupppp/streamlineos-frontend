import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function SignDashboardLoading() {
  return (
    <PageWrapper
      title="SignOS"
      subtitle="Envelopes, signatures, and completion status at a glance."
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
    >
      <div className="flex flex-col gap-4">
        <StatCardGridSkeleton cols={5} count={5} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <div className="rounded-xl border border-border bg-card">
          <div className="px-4 py-3 border-b border-border">
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
