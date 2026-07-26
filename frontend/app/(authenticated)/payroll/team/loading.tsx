import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export function TeamPayrollSkeleton() {
  return (
    <PageWrapper title="Team payroll" subtitle="Direct reports — approval when permitted">
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-lg" />
        <StatCardGridSkeleton cols={3} count={3} />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}

export default function TeamPayrollLoading() {
  return <TeamPayrollSkeleton />;
}
