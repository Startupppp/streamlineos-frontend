import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function StockLoading() {
  return (
    <PageWrapper eyebrow="Inventory" title="Stock" subtitle="Live stock levels across all warehouses.">
      <DataTableSkeleton rows={12} columns={8} />
    </PageWrapper>
  );
}
