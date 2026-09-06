import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function CrmApiKeysLoading() {
  return (
    <PageWrapper
      title="CRM API Keys"
      subtitle="Manage server credentials used to send leads into this CRM workspace."
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <DataTableSkeleton rows={8} columns={6} />
    </PageWrapper>
  );
}
