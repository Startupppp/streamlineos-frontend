import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { PmPageShell } from "@/features/projects/shared/pm-chrome";

export default function BudgetLoading() {
  return (
    <PageWrapper
      title="Budget"
      subtitle="Planned budget vs actual cost from billable timesheets"
      actions={<Skeleton className="h-8 w-32 rounded-md" />}
    >
      <PmPageShell>
        <StatCardGridSkeleton cols={3} className="mb-4" />
        <Skeleton className="h-20 rounded-xl border border-border bg-card" />
      </PmPageShell>
    </PageWrapper>
  );
}
