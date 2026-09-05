import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function ForecastDriftLoading() {
  return (
    <PageWrapper
      title="Forecast drift"
      subtitle="Which forecasts have stopped working, how much of the catalogue is covered, and how often a proposal is acted on."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-[180px]" />
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <StatCardGridSkeleton cols={4} count={4} />
        <DataTableSkeleton rows={10} columns={8} />
      </div>
    </PageWrapper>
  );
}
