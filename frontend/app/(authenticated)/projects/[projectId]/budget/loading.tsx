import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function BudgetLoading() {
  return (
    <PageWrapper
      title="Budget"
      eyebrow="Project"
      subtitle="Planned budget vs actual cost from billable timesheets"
    >
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </PageWrapper>
  );
}
