import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function DocumentTemplatesLoading() {
  return (
    <PageWrapper
      title="Document Templates"
      subtitle="Manage reusable HR document templates"
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <Skeleton className="h-9 w-64 rounded-md" />
        <DataTableSkeleton rows={8} headers={["", "Title", "Type", "Variables", "Version", "Status", "Created", ""]} />
      </div>
    </PageWrapper>
  );
}
