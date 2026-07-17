import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";

export default function DocumentTypesLoading() {
  return (
    <PageWrapper
      title="Document Types"
      subtitle="Configure required onboarding documents"
      actions={<Skeleton className="h-9 w-40 rounded-md" />}
    >
      <DataTableSkeleton rows={12} columns={6} className="flex-1 min-h-0" />
    </PageWrapper>
  );
}
