"use client";

import { useCallback, useMemo } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { useManagedProductInsights } from "@/hooks/api/build/managed-products";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import {
  MANAGED_PRODUCT_DETAIL_CONTENT_CLASS,
  ManagedProductDetailPrimarySection,
  ManagedProductDetailShell,
} from "./managed-product-detail-layout";
import { ProductInsightsSkeleton } from "./managed-product-page-skeletons";
import {
  InsightDeliveryPanel,
  InsightDiscoveryPanel,
  InsightFeedbackPanel,
  InsightOverviewPanel,
} from "./product-insights-panels";
import { INSIGHT_TABS, insightTabFromParam } from "./product-insights-tabs";

const RANGE_OPTIONS = [
  { label: "All time", value: "all" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
];

const INSIGHTS_FILTER_DEFINITIONS = [
  { param: "range" },
  {
    param: "tab",
    all: "overview",
    options: INSIGHT_TABS.map((tab) => tab.id),
  },
] as const;

interface ProductInsightsPageProps {
  managedProductId: number;
}

export function ProductInsightsPage({
  managedProductId,
}: ProductInsightsPageProps) {
  const listFilters = useBuildListFilters({
    filters: INSIGHTS_FILTER_DEFINITIONS,
    withSearch: false,
  });
  const rangeValue = listFilters.value("range");
  const tab = insightTabFromParam(listFilters.value("tab"));

  const typedRange = useMemo(
    () =>
      rangeValue === "7d" || rangeValue === "30d" || rangeValue === "90d"
        ? rangeValue
        : undefined,
    [rangeValue],
  );

  const setFilter = listFilters.setValue;
  const handleRangeChange = useCallback(
    (value: string) => setFilter("range", value),
    [setFilter],
  );
  const handleTabChange = useCallback(
    (value: string) => setFilter("tab", value),
    [setFilter],
  );

  const { data, isLoading, isError, error, refetch } =
    useManagedProductInsights(managedProductId, { range: typedRange });

  const resolution = usePageState({
    permission: "build:managed-products:view",
    isLoading,
    isError,
    error,
    isEmpty: data === null,
  });

  const rangeLabel =
    RANGE_OPTIONS.find((option) => option.value === rangeValue)?.label ??
    "All time";

  const handleRetry = useCallback(() => void refetch(), [refetch]);

  return (
    <Tabs
      value={tab}
      onValueChange={handleTabChange}
      className="h-full min-h-0 min-w-0 flex-1"
    >
      <PageWrapper
        title="Insights"
        subtitle="Customer signals, planned work, and delivery progress"
        contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}
        actions={
          <BuildFilterSelect
            label="Range"
            value={rangeValue || "all"}
            onValueChange={handleRangeChange}
            options={RANGE_OPTIONS}
          />
        }
        filters={
          <PageTabsToolbar
            tabs={
              <TabsList aria-label="Insights sections">
                {INSIGHT_TABS.map((item) => (
                  <TabsTrigger
                    key={item.id}
                    value={item.id}
                    className="px-2 sm:px-3"
                  >
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            }
          />
        }
      >
        <ManagedProductDetailShell className="h-auto min-h-full flex-none overflow-visible">
          <ManagedProductDetailPrimarySection className="flex-none">
            <PageState
              resolution={resolution}
              loading={<ProductInsightsSkeleton />}
              onRetry={handleRetry}
              empty={
                <EmptyState
                  title="Product not found"
                  description="This product may have been deleted or moved."
                  className="flex-1"
                />
              }
              className={CONTENT_FILL_PANEL}
            >
              <TabsContent value="overview" className="mt-0 outline-none">
                <InsightOverviewPanel
                  managedProductId={managedProductId}
                  insights={data}
                  rangeLabel={rangeLabel}
                />
              </TabsContent>
              <TabsContent value="delivery" className="mt-0 outline-none">
                <InsightDeliveryPanel
                  managedProductId={managedProductId}
                  insights={data}
                />
              </TabsContent>
              <TabsContent value="feedback" className="mt-0 outline-none">
                <InsightFeedbackPanel
                  managedProductId={managedProductId}
                  insights={data}
                />
              </TabsContent>
              <TabsContent value="discovery" className="mt-0 outline-none">
                <InsightDiscoveryPanel managedProductId={managedProductId} />
              </TabsContent>
            </PageState>
          </ManagedProductDetailPrimarySection>
        </ManagedProductDetailShell>
      </PageWrapper>
    </Tabs>
  );
}
