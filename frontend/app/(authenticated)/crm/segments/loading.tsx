import { DataTableSkeleton } from "@/components/ui/data-table";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function CrmSegmentsLoading() {
  return (
    <PageWrapper
      title="Segments"
      subtitle="Named criteria over your CRM records, re-evaluated on every read."
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <DataTableSkeleton rows={10} columns={5} className="flex-1" />
    </PageWrapper>
  );
}
