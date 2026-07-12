import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function MovementsLoading() {
  return (
    <PageWrapper eyebrow="Inventory · Stock" title="Movements" subtitle="Stock transaction history.">
      <DataTableSkeleton rows={8} columns={8} />
    </PageWrapper>
  );
}
