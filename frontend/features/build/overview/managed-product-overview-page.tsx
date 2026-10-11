"use client";

import Link from "next/link";
import { ManagedProductFormSheet } from "@/features/build/managed-products/managed-product-form-sheet";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { PageState } from "@/components/shared/page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BuildOfflineNotice } from "@/features/build/shared/build-offline-notice";
import { ManagedProductOverviewSkeleton } from "@/features/build/managed-products/managed-product-page-skeletons";
import { ManagedProductOverviewStrategyCard } from "./managed-product-overview-strategy-card";
import { ManagedProductOverviewEvidenceCard } from "./managed-product-overview-evidence-card";
import { ManagedProductOverviewDeliveryCard } from "./managed-product-overview-delivery-card";
import { ManagedProductOverviewOutcomesCard } from "./managed-product-overview-outcomes-card";
import { ManagedProductOverviewPreviewsCard } from "./managed-product-overview-previews-card";
import {
  useManagedProductOverview,
  PERIOD_OPTIONS,
  INITIATIVE_STATUS_OPTIONS,
} from "./use-managed-product-overview";

interface ManagedProductOverviewPageProps {
  managedProductId: number;
}

export function ManagedProductOverviewPage({ managedProductId }: ManagedProductOverviewPageProps) {
  const {
    listFilters,
    rawPeriod,
    rawTeamId,
    rawSegment,
    product,
    editOpen,
    setEditOpen,
    resolution,
    overviewSubtitle,
    editActions,
    summaryData,
    summaryDataUpdatedAt,
    teamOptions,
    segmentOptions,
    handleRetry,
    handlePeriodChange,
    handleTeamChange,
    handleInitiativeStatusChange,
    handleSegmentChange,
  } = useManagedProductOverview(managedProductId);

  return (
    <PageWrapper
      title={product?.name ?? "Product overview"}
      badge={product?.key}
      subtitle={overviewSubtitle}
      contentClassName="h-auto"
      actions={<BuildHeaderActions actions={editActions} />}
      filters={
        <BuildListToolbar
          filters={[
            {
              id: "period",
              label: "Period",
              active: listFilters.isActive("period"),
              control: (
                <BuildFilterSelect
                  label="Period"
                  value={rawPeriod ?? "all"}
                  onValueChange={handlePeriodChange}
                  options={PERIOD_OPTIONS}
                />
              ),
            },
            {
              id: "teamId",
              label: "Team",
              active: listFilters.isActive("teamId"),
              control: (
                <BuildFilterSelect
                  label="Team"
                  value={rawTeamId ?? "all"}
                  onValueChange={handleTeamChange}
                  options={teamOptions}
                />
              ),
            },
            {
              id: "initiativeStatus",
              label: "Status",
              active: listFilters.isActive("initiativeStatus"),
              control: (
                <BuildFilterSelect
                  label="Status"
                  value={listFilters.value("initiativeStatus") ?? "all"}
                  onValueChange={handleInitiativeStatusChange}
                  options={INITIATIVE_STATUS_OPTIONS}
                />
              ),
            },
            {
              id: "segment",
              label: "Segment",
              active: listFilters.isActive("segment"),
              control: (
                <BuildFilterSelect
                  label="Segment"
                  value={rawSegment ?? "all"}
                  onValueChange={handleSegmentChange}
                  options={segmentOptions}
                />
              ),
            },
          ]}
          onClearAll={listFilters.clearAll}
        />
      }
    >
      {product ? (
        <ManagedProductFormSheet
          open={editOpen}
          onOpenChange={setEditOpen}
          mode="edit"
          defaultValues={product}
        />
      ) : null}
      <PageState
        resolution={resolution}
        loading={<ManagedProductOverviewSkeleton />}
        onRetry={handleRetry}
        className="h-auto flex-none"
      >
        <div className="flex w-full min-w-0 flex-col gap-4 pb-8">
          <BuildOfflineNotice dataUpdatedAt={summaryDataUpdatedAt} />

          {summaryData ? (
            <>
              <ManagedProductOverviewStrategyCard
                managedProductId={managedProductId}
                product={summaryData.product}
              />
              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                <ManagedProductOverviewEvidenceCard
                  managedProductId={managedProductId}
                  evidence={summaryData.evidence}
                  previews={summaryData.previews}
                />
                <ManagedProductOverviewDeliveryCard
                  managedProductId={managedProductId}
                  delivery={summaryData.delivery}
                  previews={summaryData.previews}
                />
              </div>
              <ManagedProductOverviewOutcomesCard
                managedProductId={managedProductId}
                outcomes={summaryData.outcomes}
              />
              <ManagedProductOverviewPreviewsCard
                managedProductId={managedProductId}
                previews={summaryData.previews}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No summary data available.{" "}
              <Link
                href={`/build/managed-products/${managedProductId}/insights`}
                className="inline-flex min-h-11 items-center text-primary underline-offset-2 hover:underline"
              >
                Explore insights
              </Link>
            </p>
          )}
        </div>
      </PageState>
    </PageWrapper>
  );
}
