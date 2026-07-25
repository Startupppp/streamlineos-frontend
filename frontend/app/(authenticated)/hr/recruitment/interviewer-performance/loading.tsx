import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function InterviewerPerformanceLoading() {
  return (
    <PageWrapper
      title="Interviewer Performance"
      subtitle="Track how quickly interviewers submit scorecards after interviews"
      actions={<Skeleton className="h-9 w-40 rounded-md" />}
    >
      <div className="flex flex-1 min-h-0 flex-col space-y-4">
        <StatCardGridSkeleton cols={4} count={4} />
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b">
            <div className="flex gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-20" />
              ))}
            </div>
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-6 px-4 py-3">
                <div className="space-y-1 w-40 shrink-0">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
                <Skeleton className="h-4 w-8 shrink-0" />
                <Skeleton className="h-4 w-8 shrink-0" />
                <Skeleton className="h-5 w-10 rounded-full shrink-0" />
                <div className="flex items-center gap-2 flex-1">
                  <Skeleton className="h-1.5 flex-1 rounded-full" />
                  <Skeleton className="h-3 w-10 shrink-0" />
                </div>
                <div className="flex gap-1 shrink-0">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
