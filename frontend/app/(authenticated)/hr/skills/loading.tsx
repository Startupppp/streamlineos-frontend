import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function SkillsLoading() {
  return (
    <PageWrapper
      title="Skills Matrix"
      subtitle="Organization-wide skill mapping and competency tracking"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </PageWrapper>
  );
}
