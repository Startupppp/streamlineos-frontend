import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function ForecastingLoading() {
  return (
    <PageWrapper
      title="Demand Forecasting"
      subtitle="SMA-based demand projections and stockout risk assessment."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 flex-1 max-w-xs" />
        </div>
      }
    >
      <DataTableSkeleton rows={10} columns={8} className="flex-1 min-h-0" />
    </PageWrapper>
  );
}
