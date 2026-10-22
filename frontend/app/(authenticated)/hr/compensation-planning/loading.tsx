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
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <Skeleton key={n} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </PageWrapper>
  );
}
