"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { useMotionVariants } from "@/lib/motion-variants";
import { Button } from "@/components/ui/button";
import { ManagedProductFormSheet } from "@/features/build/managed-products/managed-product-form-sheet";
import { LinkExistingGoalDialog } from "@/features/build/managed-products/link-existing-goal-dialog";
import { OpportunityCreateSheet } from "@/features/build/managed-products/insights/opportunity-create-sheet";
import { ManagedProductUpdateDialog } from "./managed-product-update-dialog";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { PageState } from "@/components/shared/page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { BuildOfflineNotice } from "@/features/build/shared/build-offline-notice";
import { ManagedProductOverviewFilters } from "./managed-product-overview-filters";
import { ManagedProductOverviewSkeleton } from "@/features/build/managed-products/managed-product-page-skeletons";
import { ManagedProductNotFound } from "@/features/build/managed-products/managed-product-detail-layout";
import { ManagedProductOverviewStrategyCard } from "./managed-product-overview-strategy-card";
import { ManagedProductOverviewEvidenceCard } from "./managed-product-overview-evidence-card";
import { ManagedProductOverviewDeliveryCard } from "./managed-product-overview-delivery-card";
import { ManagedProductOverviewOutcomesCard } from "./managed-product-overview-outcomes-card";
import { ManagedProductOverviewDecisionsCard } from "./managed-product-overview-decisions-card";
import { ManagedProductOverviewUpdatesCard } from "./managed-product-overview-updates-card";
import { ManagedProductOverviewHero } from "./managed-product-overview-hero";
import { ManagedProductOverviewAttention } from "./managed-product-overview-attention";
import { ManagedProductOverviewPulse } from "./managed-product-overview-pulse";
import { ManagedProductOverviewFlow } from "./managed-product-overview-flow";
import { OverviewEmptyState } from "./overview-metric";
import { deriveAttentionSignals } from "./overview-attention-signals";
import { useManagedProductOverview } from "./use-managed-product-overview";

interface ManagedProductOverviewPageProps {
  managedProductId: number;
}

export function ManagedProductOverviewPage({
  managedProductId,
}: ManagedProductOverviewPageProps) {
  const {
    listFilters,
    rawPeriod,
    product,
    editOpen,
    setEditOpen,
    createOpen,
    setCreateOpen,
    linkGoalOpen,
    setLinkGoalOpen,
    postUpdateOpen,
    setPostUpdateOpen,
    resolution,
    overviewSubtitle,
    now,
    overviewRet,
    markReviewed,
    isMarkingReviewed,
    editActions,
    summaryData,
    summaryDataUpdatedAt,
    teamOptions,
    segmentOptions,
    teamSelectValue,
    segmentSelectValue,
    isFiltered,
    handleClearFilters,
    handleBack,
    handleRetry,
    handlePeriodChange,
    handleTeamChange,
    handleInitiativeStatusChange,
    handleSegmentChange,
    from,
    to,
    handleDateRangeChange,
  } = useManagedProductOverview(managedProductId);
  const { staggerContainer, fadeUp } = useMotionVariants();
  const attentionSignals = useMemo(
    () =>
      summaryData
        ? deriveAttentionSignals(summaryData, managedProductId, now)
        : [],
    [summaryData, managedProductId, now],
  );

  if (resolution.kind === "not-found") return <ManagedProductNotFound />;

  return (
    <PageWrapper
      title={product?.name ?? "Product overview"}
      badge={product?.key}
      subtitle={overviewSubtitle}
      onBack={handleBack}
      actions={<BuildHeaderActions actions={editActions} />}
      filters={
        <ManagedProductOverviewFilters
          rawPeriod={rawPeriod}
          teamSelectValue={teamSelectValue}
          initiativeStatus={listFilters.value("initiativeStatus") ?? "all"}
          segmentSelectValue={segmentSelectValue}
          teamOptions={teamOptions}
          segmentOptions={segmentOptions}
          from={from}
          to={to}
          isFiltered={isFiltered}
          onPeriodChange={handlePeriodChange}
          onTeamChange={handleTeamChange}
          onInitiativeStatusChange={handleInitiativeStatusChange}
          onSegmentChange={handleSegmentChange}
          onDateRangeChange={handleDateRangeChange}
          onClearFilters={handleClearFilters}
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
      <OpportunityCreateSheet
        managedProductId={managedProductId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <LinkExistingGoalDialog
        managedProductId={managedProductId}
        open={linkGoalOpen}
        onOpenChange={setLinkGoalOpen}
      />
      <ManagedProductUpdateDialog
        managedProductId={managedProductId}
        open={postUpdateOpen}
        onOpenChange={setPostUpdateOpen}
      />
      <PageState
        resolution={resolution}
        loading={<ManagedProductOverviewSkeleton />}
        onRetry={handleRetry}
      >
        <motion.div
          className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 pb-8"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {summaryData ? (
            <ManagedProductOverviewPulse summary={summaryData} />
          ) : null}

          <BuildOfflineNotice dataUpdatedAt={summaryDataUpdatedAt} />

          {summaryData ? (
            <>
              <motion.div variants={fadeUp} className="min-w-0">
                <ManagedProductOverviewHero
                  product={summaryData.product}
                  now={now}
                />
              </motion.div>
              <motion.div variants={fadeUp} className="min-w-0">
                <ManagedProductOverviewAttention
                  signals={attentionSignals}
                  onMarkReviewed={markReviewed}
                  isMarkingReviewed={isMarkingReviewed}
                />
              </motion.div>
              <ManagedProductOverviewStrategyCard
                managedProductId={managedProductId}
                product={summaryData.product}
              />
              <motion.div variants={fadeUp} className="min-w-0">
                <ManagedProductOverviewUpdatesCard managedProductId={managedProductId} />
              </motion.div>
              <motion.div variants={fadeUp} className="min-w-0">
                <ManagedProductOverviewFlow
                  managedProductId={managedProductId}
                  summary={summaryData}
                />
              </motion.div>
              <motion.div
                variants={fadeUp}
                className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
              >
                <ManagedProductOverviewDeliveryCard
                  managedProductId={managedProductId}
                  delivery={summaryData.delivery}
                  previews={summaryData.previews}
                  now={now}
                  ret={overviewRet}
                />
                <ManagedProductOverviewEvidenceCard
                  managedProductId={managedProductId}
                  evidence={summaryData.evidence}
                  previews={summaryData.previews}
                  ret={overviewRet}
                />
              </motion.div>
              <motion.div
                variants={fadeUp}
                className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2"
              >
                <ManagedProductOverviewOutcomesCard
                  managedProductId={managedProductId}
                  outcomes={summaryData.outcomes}
                  goals={summaryData.previews.goals}
                />
                <ManagedProductOverviewDecisionsCard
                  managedProductId={managedProductId}
                  decisions={summaryData.previews.decisions}
                />
              </motion.div>
            </>
          ) : isFiltered ? (
            <OverviewEmptyState>
              <p className="max-w-sm text-pretty text-sm text-muted-foreground">
                No data matches the current filters.
              </p>
              <Button type="button" variant="outline" onClick={handleClearFilters}>
                Clear filters
              </Button>
            </OverviewEmptyState>
          ) : (
            <OverviewEmptyState>
              <p className="max-w-sm text-pretty text-sm text-muted-foreground">
                No summary is available for this product yet.
              </p>
              <Button asChild>
                <Link href={`/build/managed-products/${managedProductId}/insights`}>
                  Explore insights
                </Link>
              </Button>
            </OverviewEmptyState>
          )}
        </motion.div>
      </PageState>
    </PageWrapper>
  );
}
