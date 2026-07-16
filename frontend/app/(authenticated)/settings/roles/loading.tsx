import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function RolesLoading() {
  return (
    <PageWrapper
      title="Roles & Permissions"
      subtitle="Configure access controls for each role."
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <StatCardGridSkeleton cols={4} count={4} />
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="rounded-xl border border-border bg-card">
            <div className="px-4 py-3 border-b border-border">
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="divide-y divide-border/40">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card">
            <div className="px-4 py-4 border-b border-border space-y-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="divide-y divide-border/30">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-10 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-7 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
