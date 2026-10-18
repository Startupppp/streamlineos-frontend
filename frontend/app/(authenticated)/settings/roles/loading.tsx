import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function RolesLoading() {
  return (
    <PageWrapper
      title="Roles & Permissions"
      subtitle="Configure access controls for each role."
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
      actions={<Skeleton className="h-9 w-9 rounded-md" />}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="flex h-9 w-fit items-center gap-1 rounded-md border border-border bg-card p-1">
            <Skeleton className="h-7 w-16 rounded-sm" />
            <Skeleton className="h-7 w-16 rounded-sm" />
          </div>
          <Skeleton className="h-9 w-full sm:max-w-xs lg:max-w-sm" />
        </div>
        <div className="shrink-0">
          <StatCardGridSkeleton cols={4} count={4} stackOnMobile={2} />
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 max-lg:shrink-0 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-stretch lg:overflow-hidden">
          <div className="min-h-0 max-lg:h-[min(420px,50dvh)] lg:h-full rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="divide-y divide-border/60">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-border bg-card">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
