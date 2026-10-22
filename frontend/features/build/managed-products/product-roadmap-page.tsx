"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/ui/table-pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BuildPaginatedContent } from "@/features/build/shared/build-paginated-content";
import { PageState } from "@/components/shared/page-state";
import { RoadmapItemSheet } from "@/features/build/roadmap/roadmap-item-sheet";
import { CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { RoadmapInitiativePane } from "./roadmap/roadmap-initiative-pane";
import {
  MANAGED_PRODUCT_DETAIL_CONTENT_CLASS,
  ManagedProductDetailPrimarySection,
  ManagedProductDetailShell,
  ManagedProductNotFound,
} from "./managed-product-detail-layout";
import {
  ProductRoadmapBoardSkeleton,
  ProductRoadmapSkeleton,
} from "./managed-product-page-skeletons";
import { RoadmapBoardColumns } from "./roadmap/roadmap-board-columns";
import { RoadmapTimelineView } from "./roadmap/roadmap-timeline-view";
import { RoadmapListView } from "./roadmap/roadmap-list-view";
import { RoadmapFiltersBar } from "./roadmap/roadmap-filters-bar";
import { RoadmapPreviewSheet } from "./roadmap/roadmap-preview-sheet";
import { RoadmapPublicationPanel } from "./roadmap/roadmap-publication-panel";
import { useProductReturn } from "@/features/build/shared/use-product-return";
import { useProductRoadmapState } from "./use-product-roadmap-state";

interface ProductRoadmapPageProps {
  managedProductId: number;
}

export function ProductRoadmapPage({
  managedProductId,
}: ProductRoadmapPageProps) {
  const { handleBack } = useProductReturn(`/build/managed-products/${managedProductId}`);
  const {
    canManage,
    listFilters,
    pager,
    searchInputRef,
    viewMode,
    openItemId,
    resolution,
    createOpen,
    createHorizon,
    editTarget,
    deleteTarget,
    previewOpen,
    publicationOpen,
    grouped,
    hasNext,
    allItems,
    handleViewItem,
    handleEditItem,
    handleDeleteItem,
    handleDelete,
    handleNext,
    handlePrev,
    handleRetry,
    handleOpenCreate,
    handleCloseCreate,
    handleCloseEdit,
    handleDeleteOpenChange,
    handleOpenPreview,
    handleClosePreview,
    handleOpenPublication,
    handleClosePublication,
    handleSetView,
    handleCreateInHorizon,
  } = useProductRoadmapState(managedProductId);

  const paginationFooter = (
    <TablePagination
      mode="cursor"
      rowCount={allItems.length}
      pageNumber={pager.pageNumber}
      hasMore={hasNext}
      hasPrevious={pager.hasPrevious}
      onNext={handleNext}
      onPrevious={handlePrev}
    />
  );

  if (resolution.kind === "not-found") return <ManagedProductNotFound />;

  return (
    <PageWrapper
      title="Roadmap"
      subtitle="Product roadmap items"
      onBack={handleBack}
      contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}
      noInternalScroll={viewMode === "board" || viewMode === "list"}
      actions={
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
          <Tabs value={viewMode} onValueChange={handleSetView}>
            <TabsList>
              <TabsTrigger value="board">Board</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
            </TabsList>
          </Tabs>
          {canManage && resolution.kind !== "denied" ? (
            <>
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={handleOpenPreview}
              >
                Preview
              </Button>
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={handleOpenPublication}
              >
                Publish
              </Button>
              <Button size="sm" onClick={handleOpenCreate}>
                New Item
              </Button>
            </>
          ) : null}
        </div>
      }
      filters={
        <RoadmapFiltersBar
          managedProductId={managedProductId}
          listFilters={listFilters}
          searchInputRef={searchInputRef}
        />
      }
    >
      <ManagedProductDetailShell>
        <ManagedProductDetailPrimarySection>
          <PageState
            resolution={resolution}
            loading={
              viewMode === "board" ? (
                <ProductRoadmapBoardSkeleton />
              ) : (
                <ProductRoadmapSkeleton />
              )
            }
            empty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="projects"
                title="No roadmap items yet"
                description="Add items to plan what this product is working toward."
                action={
                  canManage
                    ? { label: "Add roadmap item", onClick: handleOpenCreate }
                    : undefined
                }
              />
            }
            onRetry={handleRetry}
            className={CONTENT_FILL_PANEL}
          >
            {viewMode === "board" ? (
              <>
                <RoadmapBoardColumns
                  grouped={grouped}
                  onEdit={handleEditItem}
                  onDelete={handleDeleteItem}
                  onView={handleViewItem}
                  onCreateInHorizon={handleCreateInHorizon}
                />
                <div className="shrink-0">{paginationFooter}</div>
              </>
            ) : viewMode === "list" ? (
              <RoadmapListView
                items={allItems}
                onEdit={handleEditItem}
                onView={handleViewItem}
                pagination={{
                  pageSize: 50,
                  hasMore: hasNext,
                  hasPrevious: pager.hasPrevious,
                  pageNumber: pager.pageNumber,
                  onNext: handleNext,
                  onPrevious: handlePrev,
                }}
              />
            ) : (
              <BuildPaginatedContent
                ariaLabel="Product roadmap items"
                contentClassName="flex flex-col gap-4"
                footer={paginationFooter}
              >
                <RoadmapTimelineView
                  items={allItems}
                  onEdit={handleEditItem}
                  onDelete={handleDeleteItem}
                  onView={handleViewItem}
                />
              </BuildPaginatedContent>
            )}
          </PageState>
        </ManagedProductDetailPrimarySection>
      </ManagedProductDetailShell>

      {createOpen ? (
        <RoadmapItemSheet
          managedProductId={managedProductId}
          defaultHorizon={createHorizon}
          onClose={handleCloseCreate}
        />
      ) : null}
      {editTarget ? (
        <RoadmapItemSheet
          item={editTarget}
          managedProductId={managedProductId}
          onClose={handleCloseEdit}
        />
      ) : null}
      {previewOpen ? (
        <RoadmapPreviewSheet
          managedProductId={managedProductId}
          onClose={handleClosePreview}
        />
      ) : null}
      {publicationOpen ? (
        <RoadmapPublicationPanel
          managedProductId={managedProductId}
          onClose={handleClosePublication}
        />
      ) : null}
      <RoadmapInitiativePane itemId={openItemId} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteOpenChange}
        title="Delete roadmap item?"
        description={`"${deleteTarget?.title ?? ""}" will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}
