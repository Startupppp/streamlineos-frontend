import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function TransfersLoading() {
  return (
    <PageWrapper eyebrow="Inventory · Stock" title="Stock Transfers" subtitle="Move stock between locations.">
      <DataTableSkeleton rows={12} columns={7} />
    </PageWrapper>
  );
}
