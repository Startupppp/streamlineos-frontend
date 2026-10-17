import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function BulkJobLoading() {
  return (
    <PageWrapper title="Reporting change job">
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <StatCardGridSkeleton cols={4} />
        <DataTableSkeleton
          rows={8}
          headers={["Row", "Employee", "Primary manager", "Additional managers", "Changes in 24h", "Status"]}
        />
      </div>
    </PageWrapper>
  );
}
