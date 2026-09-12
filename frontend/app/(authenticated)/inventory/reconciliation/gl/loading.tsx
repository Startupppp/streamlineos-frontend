import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function GlReconciliationLoading() {
  return (
    <PageWrapper
      title="GL reconciliation"
      subtitle="Inventory movements against the journal entries they should have produced."
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <StatCardGridSkeleton cols={4} />
        <DataTableSkeleton rows={10} columns={6} />
      </div>
    </PageWrapper>
  );
}
