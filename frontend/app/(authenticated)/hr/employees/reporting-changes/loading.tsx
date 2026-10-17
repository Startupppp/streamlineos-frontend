import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function BulkReportingChangeLoading() {
  return (
    <PageWrapper
      title="Bulk reporting change"
      subtitle="Move many employees to a new reporting manager with a preview, a reason and one confirmation"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <DataTableSkeleton rows={6} headers={["Job", "Status", "Rows", "Committed", "Created"]} />
      </div>
    </PageWrapper>
  );
}
