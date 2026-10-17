import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function ManagerCoverageLoading() {
  return (
    <PageWrapper
      title="Manager coverage"
      subtitle="Employees whose approvals have no dependable owner, and reporting lines that need repair"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <StatCardGridSkeleton cols={3} />
        <DataTableSkeleton rows={8} headers={["Employee", "Designation", "Employment", "Employee no."]} />
      </div>
    </PageWrapper>
  );
}
