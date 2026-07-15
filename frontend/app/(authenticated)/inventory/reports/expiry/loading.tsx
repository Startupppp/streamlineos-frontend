import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function ExpiryReportLoading() {
  return (
    <PageWrapper eyebrow="Inventory · Reports" title="Expiry Report">
      <DataTableSkeleton rows={12} columns={7} />
    </PageWrapper>
  );
}
