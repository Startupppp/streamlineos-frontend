import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function LandedCostLoading() {
  return (
    <PageWrapper
      title="Landed cost"
      subtitle="Freight, duty, insurance and handling, landed into the cost of the receipt that brought the goods in."
      actions={<Skeleton className="h-9 w-32" />}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <DataTableSkeleton rows={10} columns={6} />
      </div>
    </PageWrapper>
  );
}
