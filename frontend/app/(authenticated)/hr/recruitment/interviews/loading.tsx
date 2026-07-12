import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function InterviewsLoading() {
  return (
    <PageWrapper
      title="Interviews"
      subtitle="Schedule and review candidate interviews"
      actions={<Skeleton className="h-8 w-36 rounded-md" />}
    >
      <DataTableSkeleton rows={7} columns={6} />
    </PageWrapper>
  );
}
