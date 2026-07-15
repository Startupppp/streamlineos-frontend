import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function ClientPortalLoading() {
  return (
    <PageWrapper title="Client Portal" subtitle="Control what clients see in their portal">
      <div className="px-4 pb-4">
        <DataTableSkeleton rows={12} columns={3} />
      </div>
    </PageWrapper>
  );
}
