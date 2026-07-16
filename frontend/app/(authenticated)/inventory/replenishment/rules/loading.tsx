import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function ReplenishmentRulesLoading() {
  return (
    <PageWrapper
      title="Replenishment Rules"
      actions={<Skeleton className="h-9 w-36" />}
    >
      <DataTableSkeleton rows={10} className="flex-1 min-h-0" />
    </PageWrapper>
  );
}
