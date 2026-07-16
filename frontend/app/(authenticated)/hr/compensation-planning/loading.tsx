import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function CompensationPlanningLoading() {
  return (
    <PageWrapper
      title="Compensation Planning"
      subtitle="Annual increment cycles, merit matrix, and budget pools"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </PageWrapper>
  );
}
