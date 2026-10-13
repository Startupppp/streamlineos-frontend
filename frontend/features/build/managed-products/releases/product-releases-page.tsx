"use client";

import { useMemo } from "react";
import { Archive, CalendarClock, FilePen, Plus, Rocket } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { DirtyStateProvider } from "@/components/shared/dirty-state-context";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import type { BuildHeaderAction } from "@/features/build/shared/build-header-actions";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { formatCalendarDate } from "@/lib/date-utils";
import {
  MANAGED_PRODUCT_DETAIL_CONTENT_CLASS,
  ManagedProductDetailPrimarySection,
  ManagedProductDetailShell,
} from "../managed-product-detail-layout";
import { releaseCountdown, releaseCountValue, releasesSubtitle } from "./product-releases-model";
import { ProductReleaseFormSheet } from "./product-release-form-sheet";
import { ProductReleasesSkeleton } from "./product-releases-skeleton";
import { ReleaseActionsProvider } from "./release-actions-context";
import { ReleaseArchivedSection } from "./release-archived-section";
import { ReleaseShippedTimeline } from "./release-shipped-timeline";
import { ReleaseUpcomingSection } from "./release-upcoming-section";
import { useProductReleasesPage } from "./use-product-releases-page";
import { ProductReleaseEvidenceSheet } from "./product-release-evidence-sheet";
import { useProductReturn } from "@/features/build/shared/use-product-return";

interface ProductReleasesPageProps {
  managedProductId: number;
}

const VIEW_OPTIONS = [
  { value: "active", label: "Active releases" },
  { value: "archived", label: "Archived releases" },
] as const;

export function ProductReleasesPage({ managedProductId }: ProductReleasesPageProps) {
  const page = useProductReleasesPage(managedProductId);
  const { handleBack } = useProductReturn(`/build/managed-products/${managedProductId}`);
  const { groups, hasMore, lifecycleTarget, handleCreate, detailReleaseId, handleDetailOpenChange } = page;
  const now = useMemo(() => new Date(), []);

  const headerActions = useMemo<BuildHeaderAction[]>(
    () =>
      page.canUpdate
        ? [{ id: "new-release", label: "New release", icon: Plus, primary: true, onSelect: handleCreate }]
        : [],
    [page.canUpdate, handleCreate],
  );

  const nextPlanned = groups.nextPlanned?.releaseDate ?? null;
  const isArchive = lifecycleTarget?.action === "archive";

  return (
    <DirtyStateProvider>
      <PageWrapper
        title="Releases"
        subtitle={releasesSubtitle(groups, hasMore)}
        onBack={handleBack}
        contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}
        actions={
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <BuildFilterSelect
              label="View"
              value={page.view}
              onValueChange={page.handleViewChange}
              options={VIEW_OPTIONS}
            />
            <BuildHeaderActions actions={headerActions} />
          </div>
        }
      >
        <ManagedProductDetailShell>
          <ManagedProductDetailPrimarySection>
            <PageState
              resolution={page.resolution}
              loading={<ProductReleasesSkeleton />}
              onRetry={page.handleRetry}
              className="flex-1"
              empty={
                <EmptyState
                  className="flex-1"
                  illustrationPreset="calendar"
                  title="No releases yet"
                  description="Draft a version, pick a ship date, then mark it released. Upcoming, shipped, and archive stay in one place."
                  action={page.canUpdate ? { label: "New release", onClick: handleCreate } : undefined}
                />
              }
            >
              <ReleaseActionsProvider value={page.actions}>
                <div className="flex flex-col gap-4 pb-4">
                  <StatCardGrid cols={4}>
                    <StatCard
                      label="Drafts"
                      value={releaseCountValue(groups.upcoming.length, hasMore)}
                      icon={FilePen}
                      tone="blue"
                    />
                    <StatCard
                      label="Released"
                      value={releaseCountValue(groups.shipped.length, hasMore)}
                      icon={Rocket}
                      tone="emerald"
                    />
                    <StatCard
                      label="Archived"
                      value={releaseCountValue(groups.archived.length, hasMore)}
                      icon={Archive}
                    />
                    <StatCard
                      label="Next planned"
                      value={nextPlanned ? formatCalendarDate(nextPlanned) : "Not scheduled"}
                      hint={nextPlanned ? releaseCountdown(nextPlanned, now).label : undefined}
                      icon={CalendarClock}
                      tone={nextPlanned ? "amber" : "default"}
                    />
                  </StatCardGrid>

                  {page.view === "archived" ? (
                    <ReleaseArchivedSection
                      releases={groups.archived}
                      count={releaseCountValue(groups.archived.length, hasMore)}
                    />
                  ) : (
                    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-5">
                      <ReleaseUpcomingSection
                        releases={groups.upcoming}
                        count={releaseCountValue(groups.upcoming.length, hasMore)}
                        now={now}
                        className="lg:col-span-2"
                      />
                      <ReleaseShippedTimeline
                        releases={groups.shipped}
                        count={releaseCountValue(groups.shipped.length, hasMore)}
                        className="lg:col-span-3"
                      />
                    </div>
                  )}

                  <InfiniteScrollSentinel
                    hasNextPage={hasMore}
                    isFetchingNextPage={page.isFetchingNextPage}
                    onLoadMore={page.handleLoadMore}
                    label="Load more releases"
                  />
                </div>
              </ReleaseActionsProvider>
            </PageState>
          </ManagedProductDetailPrimarySection>
        </ManagedProductDetailShell>

        {page.canUpdate ? (
          <ProductReleaseFormSheet
            managedProductId={managedProductId}
            editTarget={page.editTarget}
            open={page.sheetOpen}
            onOpenChange={page.handleSheetOpenChange}
          />
        ) : null}

        <ConfirmDialog
          open={lifecycleTarget !== null}
          onOpenChange={page.handleLifecycleOpenChange}
          title={isArchive ? "Archive this release?" : "Restore this release?"}
          description={
            isArchive
              ? `${lifecycleTarget?.release.name ?? "This release"} will move out of Upcoming and Shipped. You can restore it later.`
              : `${lifecycleTarget?.release.name ?? "This release"} will return to Upcoming as a draft.`
          }
          confirmLabel={isArchive ? "Archive" : "Restore"}
          destructive={isArchive}
          isPending={page.isLifecyclePending}
          keepOpenOnConfirm
          onConfirm={page.handleLifecycleConfirm}
        />

        <ProductReleaseEvidenceSheet
          managedProductId={managedProductId}
          releaseId={detailReleaseId ?? 0}
          open={detailReleaseId !== null}
          onOpenChange={handleDetailOpenChange}
        />
      </PageWrapper>
    </DirtyStateProvider>
  );
}
