import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function TransitLoading() {
  return (
    <PageWrapper
      title="In transit"
      subtitle="Goods a dispatch put on the road, and what a short receipt left behind."
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <StatCardGridSkeleton cols={3} />
        <DataTableSkeleton rows={10} columns={6} />
      </div>
    </PageWrapper>
  );
}
