import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function PolicyVersionsLoading() {
  return (
    <PageWrapper
      title="Policy versions"
      subtitle="Review the change history for HR policies"
    >
      <DataTableSkeleton rows={8} columns={5} />
    </PageWrapper>
  );
}
