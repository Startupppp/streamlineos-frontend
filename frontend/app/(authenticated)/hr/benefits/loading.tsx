import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

const PLAN_CARDS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function BenefitsLoading() {
  return (
    <PageWrapper
      title="Benefits"
      subtitle="Manage employee benefit plans, enrollments, and insurance claims"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex items-center gap-1 shrink-0">
          <Skeleton className="h-7 w-28 rounded-md" />
          <Skeleton className="h-7 w-20 rounded-md" />
          <Skeleton className="h-7 w-28 rounded-md" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLAN_CARDS.map((n) => (
            <Skeleton key={n} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
