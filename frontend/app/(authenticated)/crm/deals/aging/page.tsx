"use client";

import { useMemo, useCallback } from "react";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { useRouter } from "next/navigation";
import { AlertTriangle, Banknote, Clock, TrendingDown } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyDealsIllustration } from "@/components/illustrations";
import {
  CONTENT_FILL_PANEL,
  FILTER_TOOLBAR_ROW,
} from "@/components/ui/content-fill-panel";
import { RecordList, asRecordValues, type RecordValue } from "@/components/renderer";
import { DensityToggle, useDensity } from "@/components/renderer/density-toggle";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import {
  DEAL_AGING_LAYOUT,
  dealAgingRecordFields,
} from "@/lib/renderer/crm/deal-aging-layout";
import { withDealStages } from "@/lib/renderer/crm/deal-layout";
import { useDealAging } from "@/hooks/api/crm";
import { useCrmStages } from "@/hooks/api/crm/metadata";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { formatMoneyCompact } from "@/lib/format-utils";

/**
 * Deals that have stopped moving.
 *
 * No table is written here. The columns, their alignment, the stage badge, the
 * severity badge and the mobile card all come from `DEAL_AGING_LAYOUT`; what is
 * left is the four figures at the top and where a row goes when you click it.
 *
 * The severity verdict is a badge the description carries rather than the
 * `getDayClassName` helper this screen used to hold, which tinted the day count
 * red past thirty and amber past fifteen. Two things follow: the judgement now
 * has a word in it, so it survives greyscale and a screen reader, and the
 * thresholds live once beside the field they define instead of once per screen
 * that shows a day count.
 */
export default function DealAgingPage() {
  const router = useRouter();
  const money = useOrgDisplay();
  const [density, setDensity] = useDensity();

  const tenantLayout = useTenantLayout(DEAL_AGING_LAYOUT);
  const { data: stages } = useCrmStages("deal");
  const layout = useMemo(() => withDealStages(tenantLayout, stages ?? []), [tenantLayout, stages]);

  const { data, isLoading, isError, error, refetch } = useDealAging();

  const rows = useMemo(() => {
    const deals = data?.deals ?? [];
    return asRecordValues(
      [...deals].sort((a, b) => b.daysInStage - a.daysInStage).map(dealAgingRecordFields),
    );
  }, [data?.deals]);

  const stats = useMemo(() => {
    const deals = data?.deals ?? [];
    if (deals.length === 0) return { totalStale: 0, avgDays: 0, oldestDays: 0, totalValue: 0 };
    return {
      totalStale: deals.filter((deal) => deal.daysInStage > 14).length,
      avgDays: Math.round(
        deals.reduce((sum, deal) => sum + deal.daysInStage, 0) / deals.length,
      ),
      oldestDays: Math.max(...deals.map((deal) => deal.daysInStage)),
      totalValue: deals.reduce((sum, deal) => sum + Number(deal.value ?? 0), 0),
    };
  }, [data?.deals]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleRowClick = useCallback(
    (row: RecordValue) => router.push(`/crm/deals/${String(row.id)}`),
    [router],
  );

  const pageState = usePageState({ permission: "crm:deals:read", isLoading, isError, error });

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading")
    return (
      <PageWrapper title="Deal aging" subtitle="Deals that have stopped moving through the pipeline" backHref="/crm/deals">
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="Deal aging"
      subtitle="Deals that have stopped moving through the pipeline"
      backHref="/crm/deals"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <DensityToggle density={density} onChange={setDensity} />
        </div>
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        <StatCardGrid cols={4}>
          <StatCard
            label="Stalled deals"
            value={stats.totalStale}
            icon={AlertTriangle}
            tone="red"
            isLoading={isLoading}
          />
          <StatCard
            label="Average days stuck"
            value={`${stats.avgDays}d`}
            icon={Clock}
            tone="amber"
            isLoading={isLoading}
          />
          <StatCard
            label="Oldest deal"
            value={`${stats.oldestDays}d`}
            icon={TrendingDown}
            tone="blue"
            isLoading={isLoading}
          />
          <StatCard
            label="Value at risk"
            value={formatMoneyCompact(stats.totalValue, money)}
            icon={Banknote}
            tone="blue"
            isLoading={isLoading}
          />
        </StatCardGrid>

        {isLoading ? (
          <DataTableSkeleton rows={12} columns={layout.list.columns.length} className="flex-1" />
        ) : rows.length === 0 ? (
          <EmptyState
            illustration={<EmptyDealsIllustration />}
            title="Every deal is moving"
            description="Nothing has been sitting in one stage long enough to worry about. Deals that stall will show up here with how long they have been stuck."
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <RecordList
            layout={layout}
            rows={rows}
            getRowKey={(row) => String(row.id)}
            onRowClick={handleRowClick}
            density={density}
            money={money}
            minWidth="900px"
            className={CONTENT_FILL_PANEL}
          />
        )}
      </div>
    </PageWrapper>
  );
}
