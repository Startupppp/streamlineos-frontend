"use client";

import { useCallback, useMemo } from "react";
import {
  BarChart2,
  CheckCircle2,
  FolderOpen,
  Inbox,
  LayoutGrid,
  MessageSquare,
  ThumbsUp,
  Clock,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  StatCard,
  StatCardGrid,
  StatCardGridSkeleton,
} from "@/components/ui/stat-card";
import { CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { useManagedProductInsights } from "@/hooks/api/build/managed-products";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { EmptyState } from "@/components/ui/empty-state";
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

const INSIGHTS_FILTER_DEFINITIONS = [{ param: "range" }] as const;

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

  const typedRange = useMemo(
    () =>
      rangeValue === "7d" || rangeValue === "30d" || rangeValue === "90d"
        ? rangeValue
        : undefined,
    [rangeValue],
  );

  const handleRangeChange = useCallback(
    (value: string) => listFilters.setValue("range", value),
    [listFilters],
  );

  const { data, isLoading, isError, error, refetch } =
    useManagedProductInsights(managedProductId, {
      range: typedRange,
    });

  const resolution = usePageState({
    permission: "build:managed-products:view",
    isLoading,
    isError,
    error,
    isEmpty: !data,
  });

  const openSubmissions = data?.submissionsByStatus.open ?? 0;
  const inProgressSubmissions = data?.submissionsByStatus.in_progress ?? 0;
  const resolvedSubmissions = data?.submissionsByStatus.resolved ?? 0;
  const activeRoadmap =
    (data?.roadmapItemsByStatus.planned ?? 0) +
    (data?.roadmapItemsByStatus.in_progress ?? 0);
  const completedRoadmap = data?.roadmapItemsByStatus.completed ?? 0;
  const linkedFeedback = Object.values(data?.feedbackByStatus ?? {}).reduce(
    (total, value) => total + value,
    0,
  );
  const rangeLabel =
    RANGE_OPTIONS.find((option) => option.value === rangeValue)?.label ??
    "All time";

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
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
    >
      <ManagedProductDetailShell className="h-auto min-h-full flex-none overflow-visible">
        <ManagedProductDetailPrimarySection className="flex-none">
          <PageState
            resolution={resolution}
            loading={
              <div className="space-y-6">
                <div>
                  <h2 className="mb-3 text-sm font-medium text-foreground">
                    Projects
                  </h2>
                  <StatCardGridSkeleton cols={3} />
                </div>
                <div>
                  <h2 className="mb-3 text-sm font-medium text-foreground">
                    Feedback submissions
                  </h2>
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
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">
                      Where to focus
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Activity created in {rangeLabel.toLowerCase()}; status
                      reflects where that work stands now.
                    </p>
                  </div>
                  <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                    {rangeLabel}
                  </span>
                </div>
                <StatCardGrid cols={3} className="mt-4" stackOnMobile>
                  <StatCard
                    label="Needs triage"
                    value={openSubmissions}
                    icon={Inbox}
                    tone="amber"
                    subtitle="Open customer submissions below"
                    href={`/build/managed-products/${managedProductId}/feedback?status=open`}
                  />
                  <StatCard
                    label="Planned or underway"
                    value={activeRoadmap}
                    icon={Clock}
                    tone="blue"
                    subtitle="Roadmap items"
                    href={`/build/managed-products/${managedProductId}/roadmap`}
                  />
                  <StatCard
                    label="Delivered"
                    value={completedRoadmap}
                    icon={CheckCircle2}
                    tone="emerald"
                    subtitle="Completed roadmap items"
                    href={`/build/managed-products/${managedProductId}/roadmap?status=completed`}
                  />
                </StatCardGrid>
              </div>
              <div>
                <h2 className="mb-3 text-sm font-medium text-foreground">
                  Delivery coverage
                </h2>
                <StatCardGrid cols={3}>
                  <StatCard
                    label="Linked projects"
                    value={data?.linkedProjectCount ?? 0}
                    icon={LayoutGrid}
                    tone="default"
                    href={`/build/managed-products/${managedProductId}/projects`}
                  />
                  <StatCard
                    label="Active"
                    value={data?.projectsByStatus.active ?? 0}
                    icon={FolderOpen}
                    tone="emerald"
                    href={`/build/managed-products/${managedProductId}/projects?filterStatus=ACTIVE`}
                  />
                  <StatCard
                    label="Completed"
                    value={data?.projectsByStatus.completed ?? 0}
                    icon={CheckCircle2}
                    tone="blue"
                    href={`/build/managed-products/${managedProductId}/projects?filterStatus=COMPLETED`}
                  />
                </StatCardGrid>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-medium text-foreground">
                  Customer response
                </h2>
                <StatCardGrid cols={4}>
                  <StatCard
                    label="Open"
                    value={openSubmissions}
                    icon={Inbox}
                    tone="default"
                    href={`/build/managed-products/${managedProductId}/feedback?status=open`}
                  />
                  <StatCard
                    label="In progress"
                    value={inProgressSubmissions}
                    icon={BarChart2}
                    tone="amber"
                    href={`/build/managed-products/${managedProductId}/feedback?status=in_progress`}
                  />
                  <StatCard
                    label="Resolved"
                    value={resolvedSubmissions}
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
                <h2 className="mb-1 text-sm font-medium text-foreground">
                  Evidence linked to the roadmap
                </h2>
                <p className="mb-3 text-xs text-muted-foreground">
                  Linked feedback posts are distinct from widget submissions
                  above.
                </p>
                <StatCardGrid cols={4}>
                  <StatCard
                    label="Roadmap items"
                    value={data?.roadmapItemCount ?? 0}
                    icon={LayoutGrid}
                    tone="default"
                    href={`/build/managed-products/${managedProductId}/roadmap`}
                  />
                  <StatCard
                    label="Completed items"
                    value={data?.roadmapItemsByStatus.completed ?? 0}
                    icon={CheckCircle2}
                    tone="blue"
                    href={`/build/managed-products/${managedProductId}/roadmap?status=completed`}
                  />
                  <StatCard
                    label="Linked feedback"
                    value={linkedFeedback}
                    icon={MessageSquare}
                    tone="amber"
                    href={`/build/managed-products/${managedProductId}/roadmap`}
                  />
                  <StatCard
                    label="Feedback votes"
                    value={data?.linkedFeedbackVoteCount ?? 0}
                    icon={ThumbsUp}
                    tone="emerald"
                    href={`/build/managed-products/${managedProductId}/roadmap`}
                  />
                </StatCardGrid>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-medium text-foreground">
                  Product context
                </h2>
                <StatCardGrid cols={2}>
                  <StatCard
                    label="Days since product update"
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
                  <div
                    className="mt-3 rounded-md border p-3 text-sm text-muted-foreground"
                    data-testid="score-override-reason"
                  >
                    <span className="font-medium text-foreground">
                      Override:{" "}
                    </span>
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
