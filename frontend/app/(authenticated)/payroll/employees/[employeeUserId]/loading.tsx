import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function EmployeeProfileDetailLoading() {
  return (
    <PageWrapper title="Salary Profile" backHref="/payroll/employees" actions={<Skeleton className="h-9 w-28 rounded-md" />}>
      <div className="space-y-4">
        <StatCardGridSkeleton cols={3} count={3} />
        <StatCardGridSkeleton cols={2} count={2} />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    </PageWrapper>
  );
}
