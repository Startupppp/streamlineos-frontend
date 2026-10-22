import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function FormsSettingsLoading() {
  return (
    <PageWrapper
      title="Forms"
      subtitle="Manage HR forms and data collection templates"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <DataTableSkeleton rows={6} columns={4} />
    </PageWrapper>
  );
}
