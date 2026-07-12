import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function AdjustmentsLoading() {
  return (
    <PageWrapper eyebrow="Inventory · Stock" title="Adjustments" subtitle="Stock quantity adjustments.">
      <DataTableSkeleton rows={7} columns={6} />
    </PageWrapper>
  );
}
