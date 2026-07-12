import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function SlowMovingReportLoading() {
  return (
    <PageWrapper eyebrow="Inventory · Reports" title="Slow-Moving Inventory">
      <DataTableSkeleton rows={8} columns={6} />
    </PageWrapper>
  );
}
