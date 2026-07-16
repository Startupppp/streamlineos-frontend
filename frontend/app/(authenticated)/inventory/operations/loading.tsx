import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function OperationsLoading() {
  return (
    <PageWrapper
      title="Operations"
      subtitle="Operational cockpit for daily inventory workflow"
    >
      <StatCardGridSkeleton cols={4} count={4} />
      <DataTableSkeleton rows={8} className="flex-1 min-h-0" />
    </PageWrapper>
  );
}
