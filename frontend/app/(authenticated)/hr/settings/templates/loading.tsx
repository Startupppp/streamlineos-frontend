import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function TemplatesSettingsLoading() {
  return (
    <PageWrapper
      title="Templates"
      subtitle="Manage document and email templates"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <DataTableSkeleton rows={8} columns={4} />
    </PageWrapper>
  );
}
