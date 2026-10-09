"use client";

import { useCallback, useMemo } from "react";
import { BarChart2, CheckCircle2, FolderOpen, Inbox, LayoutGrid, MessageSquare, ThumbsUp, Clock } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { useManagedProductInsights } from "@/hooks/api/build/managed-products";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { getUserDisplayName } from "@/lib/person-display";
import {
  MANAGED_PRODUCT_DETAIL_CONTENT_CLASS,
  ManagedProductDetailPrimarySection,
  ManagedProductDetailShell,
} from "./managed-product-detail-layout";

const RANGE_OPTIONS = [
  { label: "All time", value: "all" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
];

const INSIGHTS_FILTER_DEFINITIONS = [
  { param: "range" },
] as const;

interface ProductInsightsPageProps {
  managedProductId: number;
}

export function ProductInsightsPage({ managedProductId }: ProductInsightsPageProps) {
  const listFilters = useBuildListFilters({ filters: INSIGHTS_FILTER_DEFINITIONS, withSearch: false });
  const rangeValue = listFilters.value("range");

  const typedRange = useMemo(
    () => (rangeValue === "7d" || rangeValue === "30d" || rangeValue === "90d" ? rangeValue : undefined),
    [rangeValue],
  );

  const handleRangeChange = useCallback(
    (value: string) => listFilters.setValue("range", value),
    [listFilters],
  );

  const { data, isLoading, isError, error, refetch } = useManagedProductInsights(managedProductId, {
    range: typedRange,
  });

  const resolution = usePageState({
    permission: "build:managed-products:view",
    isLoading,
    isError,
    error,
    isEmpty: !data,
  });

  function handleRetry() {
    void refetch();
  }

  return (
    <PageWrapper
      title="Insights"
      subtitle="Aggregated activity for this product"
      contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}
      filters={
        <BuildListToolbar
          filters={[
            {
              id: "range",
              label: "Range",
              active: listFilters.isActive("range"),
              control: (
                <BuildFilterSelect
                  label="Range"
                  value={rangeValue}
                  onValueChange={handleRangeChange}
                  options={RANGE_OPTIONS}
                />
              ),
            },
          ]}
          onClearAll={listFilters.clearAll}
        />
      }
    >
      <ManagedProductDetailShell>
        <ManagedProductDetailPrimarySection>
          <PageState
            resolution={resolution}
            loading={
              <div className="space-y-6">
                <div>
                  <h2 className="mb-3 text-sm font-medium text-foreground">Projects</h2>
                  <StatCardGridSkeleton cols={3} />
                </div>
                <div>
                  <h2 className="mb-3 text-sm font-medium text-foreground">Feedback submissions</h2>
                  <StatCardGridSkeleton cols={4} />
                </div>
              </div>
            }
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
            <div className="space-y-6">
              <div>
                <h2 className="mb-3 text-sm font-medium text-foreground">Projects</h2>
                <StatCardGrid cols={3}>
                  <StatCard
                    label="Linked projects"
                    value={data?.linkedProjectCount ?? 0}
                    icon={LayoutGrid}
                    tone="default"
                  />
                  <StatCard
                    label="Active"
                    value={data?.projectsByStatus.active ?? 0}
                    icon={FolderOpen}
                    tone="emerald"
                  />
                  <StatCard
                    label="Completed"
                    value={data?.projectsByStatus.completed ?? 0}
                    icon={CheckCircle2}
                    tone="blue"
                  />
                </StatCardGrid>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-medium text-foreground">Feedback submissions</h2>
                <StatCardGrid cols={4}>
                  <StatCard
                    label="Open"
                    value={data?.submissionsByStatus.open ?? 0}
                    icon={Inbox}
                    tone="default"
                    href={`/build/managed-products/${managedProductId}/feedback?status=open`}
                  />
                  <StatCard
                    label="In progress"
                    value={data?.submissionsByStatus.in_progress ?? 0}
                    icon={BarChart2}
                    tone="amber"
                    href={`/build/managed-products/${managedProductId}/feedback?status=in_progress`}
                  />
                  <StatCard
                    label="Resolved"
                    value={data?.submissionsByStatus.resolved ?? 0}
                    icon={CheckCircle2}
                    tone="emerald"
                    href={`/build/managed-products/${managedProductId}/feedback?status=resolved`}
                  />
                  <StatCard
                    label="Archived"
                    value={data?.submissionsByStatus.archived ?? 0}
                    icon={FolderOpen}
                    tone="default"
                    href={`/build/managed-products/${managedProductId}/feedback?status=archived`}
                  />
                </StatCardGrid>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-medium text-foreground">Roadmap outcomes</h2>
                <StatCardGrid cols={4}>
                  <StatCard
                    label="Roadmap items"
                    value={data?.roadmapItemCount ?? 0}
                    icon={LayoutGrid}
                    tone="default"
                  />
                  <StatCard
                    label="Completed items"
                    value={data?.roadmapItemsByStatus.completed ?? 0}
                    icon={CheckCircle2}
                    tone="blue"
                  />
                  <StatCard
                    label="Linked feedback"
                    value={Object.values(data?.feedbackByStatus ?? {}).reduce((total, value) => total + value, 0)}
                    icon={MessageSquare}
                    tone="amber"
                  />
                  <StatCard
                    label="Feedback votes"
                    value={data?.linkedFeedbackVoteCount ?? 0}
                    icon={ThumbsUp}
                    tone="emerald"
                  />
                </StatCardGrid>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-medium text-foreground">Score</h2>
                <StatCardGrid cols={2}>
                  <StatCard
                    label="Age (days)"
                    value={data?.ageDays ?? 0}
                    icon={Clock}
                    tone="default"
                  />
                  {data?.confidenceScore != null && (
                    <StatCard
                      label="Confidence score"
                      value={data.confidenceScore}
                      icon={CheckCircle2}
                      tone="blue"
                    />
                  )}
                </StatCardGrid>
                {data?.overrideReason != null && (
                  <div className="mt-3 rounded-md border p-3 text-sm text-muted-foreground" data-testid="score-override-reason">
                    <span className="font-medium text-foreground">Override: </span>
                    {data.overrideReason}
                    {data.overriddenBy != null && (
                      <span className="ml-1">
                        — {getUserDisplayName(data.overriddenBy)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </PageState>
        </ManagedProductDetailPrimarySection>
      </ManagedProductDetailShell>
    </PageWrapper>
  );
}
