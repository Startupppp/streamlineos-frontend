import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function AssetReturnsLoading() {
  return (
    <PageWrapper
      title="Asset Returns"
      subtitle="Track and manage company asset returns from employees"
      actions={<div className="h-9 w-[130px]" />}
    >
      <DataTableSkeleton rows={12} headers={["Asset", "Employee", "Status", "Condition", "Date", ""]} className="flex-1 min-h-0" />
    </PageWrapper>
  );
}
