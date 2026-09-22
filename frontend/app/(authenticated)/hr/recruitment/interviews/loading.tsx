import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function InterviewsLoading() {
  return (
    <PageWrapper
      title="Interviews"
      subtitle="Schedule and track interviews"
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-16 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col space-y-4">
        <StatCardGridSkeleton cols={4} count={4} />
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
        <DataTableSkeleton rows={12} headers={["Candidate", "Type", "Scheduled", "Duration", "Result", ""]} className="flex-1 min-h-0" />
      </div>
    </PageWrapper>
  );
}
