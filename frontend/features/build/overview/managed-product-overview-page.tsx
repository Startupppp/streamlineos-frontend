"use client";

import Link from "next/link";
import { ManagedProductFormSheet } from "@/features/build/managed-products/managed-product-form-sheet";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { PageState } from "@/components/shared/page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BuildOfflineNotice } from "@/features/build/shared/build-offline-notice";
import {
  MANAGED_PRODUCT_DETAIL_CONTENT_CLASS,
  ManagedProductDetailPrimarySection,
  ManagedProductDetailShell,
} from "@/features/build/managed-products/managed-product-detail-layout";
import { ManagedProductOverviewSkeleton } from "@/features/build/managed-products/managed-product-page-skeletons";
import { ManagedProductOverviewStrategyCard } from "./managed-product-overview-strategy-card";
import { ManagedProductOverviewEvidenceCard } from "./managed-product-overview-evidence-card";
import { ManagedProductOverviewDeliveryCard } from "./managed-product-overview-delivery-card";
import { ManagedProductOverviewOutcomesCard } from "./managed-product-overview-outcomes-card";
import {
  useManagedProductOverview,
  PERIOD_OPTIONS,
} from "./use-managed-product-overview";

interface ManagedProductOverviewPageProps {
  managedProductId: number;
}

export function ManagedProductOverviewPage({ managedProductId }: ManagedProductOverviewPageProps) {
  const {
    listFilters,
    rawPeriod,
    product,
    editOpen,
    setEditOpen,
    resolution,
    overviewSubtitle,
    editActions,
    summaryData,
    summaryDataUpdatedAt,
    handleRetry,
    handlePeriodChange,
  } = useManagedProductOverview(managedProductId);

  return (
    <PageWrapper
      title={product?.name ?? "Product overview"}
      badge={product?.key}
      subtitle={overviewSubtitle}
      contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}
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
      <ManagedProductDetailShell>
        <ManagedProductDetailPrimarySection>
          <PageState
            resolution={resolution}
            loading={<ManagedProductOverviewSkeleton />}
            onRetry={handleRetry}
            className="flex-1 min-h-0"
          >
            <div className="flex flex-1 min-h-0 flex-col gap-6">
              <BuildOfflineNotice dataUpdatedAt={summaryDataUpdatedAt} />

              {summaryData ? (
                <>
                  <ManagedProductOverviewStrategyCard
                    managedProductId={managedProductId}
                    product={summaryData.product}
                  />
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
                  <ManagedProductOverviewOutcomesCard
                    managedProductId={managedProductId}
                    outcomes={summaryData.outcomes}
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No summary data available.{" "}
                  <Link
                    href={`/build/managed-products/${managedProductId}/insights`}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Explore insights
                  </Link>
                </p>
              )}
            </div>
          </PageState>
        </ManagedProductDetailPrimarySection>
      </ManagedProductDetailShell>
    </PageWrapper>
  );
}
