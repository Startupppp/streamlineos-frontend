import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import {
  InventoryTableSkeleton,
  ListActionSkeleton,
  ListFilterSkeleton,
} from "./inventory-page-skeletons";

export interface InventoryListPageLoadingProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  filterCount?: number;
  statCols?: 2 | 3 | 4 | 5 | 6;
  statCount?: number;
  showStats?: boolean;
  contentRows?: number;
}

export function InventoryListPageLoading({
  title,
  subtitle,
  actions,
  filters,
  filterCount = 2,
  statCols = 4,
  statCount,
  showStats = false,
  contentRows = 12,
}: InventoryListPageLoadingProps) {
  const resolvedActions =
    actions !== undefined ? actions : <ListActionSkeleton />;
  const resolvedFilters =
    filters !== undefined ? filters : <ListFilterSkeleton count={filterCount} />;

  return (
    <PageWrapper
      title={title}
      subtitle={subtitle}
      actions={resolvedActions}
      filters={resolvedFilters}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {(showStats || statCount !== undefined) && (
          <StatCardGridSkeleton cols={statCols} count={statCount} />
        )}
        <InventoryTableSkeleton rows={contentRows} />
      </div>
    </PageWrapper>
  );
}
