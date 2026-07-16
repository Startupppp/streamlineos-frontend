import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function RecruitmentLoading() {
  return (
    <PageWrapper
      title="Command Center"
      subtitle="Today's recruiting operations, in one place"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-32 rounded-full" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
              <Skeleton className="h-5 w-36" />
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
