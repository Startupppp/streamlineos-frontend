import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import {
  DetailActionSkeleton,
  InventoryTableSkeleton,
} from "./inventory-page-skeletons";

export interface InventoryDetailPageLoadingProps {
  title: string;
  backHref?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  statCols?: 2 | 3 | 4 | 5 | 6;
  statCount?: number;
  contentRows?: number;
}

export function InventoryDetailPageLoading({
  title,
  backHref,
  subtitle,
  actions,
  statCols = 4,
  statCount,
  contentRows = 12,
}: InventoryDetailPageLoadingProps) {
  return (
    <PageWrapper
      title={title}
      subtitle={subtitle}
      backHref={backHref}
      actions={actions !== undefined ? actions : <DetailActionSkeleton />}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <StatCardGridSkeleton cols={statCols} count={statCount} />
        <InventoryTableSkeleton rows={contentRows} />
      </div>
    </PageWrapper>
  );
}
