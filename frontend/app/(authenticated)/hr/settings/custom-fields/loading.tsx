import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function CustomFieldsSettingsLoading() {
  return (
    <PageWrapper
      title="Custom fields"
      subtitle="Define custom data fields for HR records"
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
    >
      <DataTableSkeleton rows={8} columns={5} />
    </PageWrapper>
  );
}
