"use client";

import { useCallback, useMemo } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { useManagedProductInsights } from "@/hooks/api/build/managed-products";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import {
  MANAGED_PRODUCT_DETAIL_CONTENT_CLASS,
  ManagedProductDetailPrimarySection,
  ManagedProductDetailShell,
  ManagedProductNotFound,
} from "./managed-product-detail-layout";
import { ProductInsightsSkeleton } from "./managed-product-page-skeletons";
import {
  InsightDeliveryPanel,
  InsightDiscoveryPanel,
  InsightFeedbackPanel,
  InsightOverviewPanel,
} from "./product-insights-panels";
import {
  INSIGHT_TABS,
  INSIGHT_VIEWS,
  insightTabFromParam,
  insightViewFromParam,
} from "./product-insights-tabs";
import { useProductReturn } from "@/features/build/shared/use-product-return";

const RANGE_OPTIONS = [
  { label: "All time", value: "all" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
];

const INSIGHTS_FILTER_DEFINITIONS = [
  { param: "range" },
  {
    param: "view",
    all: "overview",
    options: INSIGHT_VIEWS.map((view) => view.id),
  },
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
  const { handleBack } = useProductReturn(`/build/managed-products/${managedProductId}`);
  const listFilters = useBuildListFilters({
    filters: INSIGHTS_FILTER_DEFINITIONS,
    withSearch: false,
  });
  const rangeValue = listFilters.value("range");
  const requestedView = insightViewFromParam(listFilters.value("view"));
  const legacyTab = insightTabFromParam(listFilters.value("tab"));
  const view = requestedView === "discovery" || legacyTab === "discovery" ? "discovery" : "overview";

  const typedRange = useMemo(
    () =>
      rangeValue === "7d" || rangeValue === "30d" || rangeValue === "90d"
        ? rangeValue
        : undefined,
    [rangeValue],
  );

  const setFilter = listFilters.setValue;
  const setFilters = listFilters.setValues;
  const handleRangeChange = useCallback(
    (value: string) => setFilter("range", value),
    [setFilter],
  );
  const handleViewChange = useCallback(
    (value: string) => {
      if (value === "discovery") {
        setFilter("view", "discovery");
        return;
      }
      setFilters({ view: "overview", tab: "overview" });
    },
    [setFilter, setFilters],
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

  if (resolution.kind === "not-found" || resolution.kind === "empty") {
    return <ManagedProductNotFound />;
  }

  return (
    <Tabs
      value={view}
      onValueChange={handleViewChange}
      className="h-full min-h-0 min-w-0 flex-1"
    >
      <PageWrapper
        title="Insights"
        subtitle="Customer signals, planned work, and delivery progress"
        onBack={handleBack}
        contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}
        actions={
          view === "overview" ? (
            <BuildFilterSelect
              label="Range"
              value={rangeValue || "all"}
              onValueChange={handleRangeChange}
              options={RANGE_OPTIONS}
            />
          ) : undefined
        }
        filters={
          <PageTabsToolbar
            tabs={
              <TabsList aria-label="Insights views">
                {INSIGHT_VIEWS.map((item) => (
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
              className={CONTENT_FILL_PANEL}
            >
              <TabsContent value="overview" className="mt-0 outline-none">
                <div className="space-y-6">
                  <InsightOverviewPanel
                    managedProductId={managedProductId}
                    insights={data}
                    rangeLabel={rangeLabel}
                  />
                  <InsightDeliveryPanel
                    managedProductId={managedProductId}
                    insights={data}
                  />
                  <InsightFeedbackPanel
                    managedProductId={managedProductId}
                    insights={data}
                  />
                </div>
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
