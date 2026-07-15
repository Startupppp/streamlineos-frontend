import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function MovementsLoading() {
  return (
    <PageWrapper title="Movements" subtitle="Stock transaction history.">
      <DataTableSkeleton rows={12} columns={8} />
    </PageWrapper>
  );
}
