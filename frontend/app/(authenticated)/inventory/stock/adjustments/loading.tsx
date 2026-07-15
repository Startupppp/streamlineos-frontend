import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function AdjustmentsLoading() {
  return (
    <PageWrapper title="Adjustments" subtitle="Stock quantity adjustments.">
      <DataTableSkeleton rows={12} columns={6} />
    </PageWrapper>
  );
}
