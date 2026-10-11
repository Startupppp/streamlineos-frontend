"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageState } from "@/components/shared/page-state";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { EmptyProjectsIllustration } from "@/components/illustrations";
import {
  MANAGED_PRODUCT_DETAIL_CONTENT_CLASS,
  ManagedProductDetailPrimarySection,
  ManagedProductDetailShell,
} from "@/features/build/managed-products/managed-product-detail-layout";
import { PRODUCT_PROJECT_SKELETON_HEADERS } from "@/features/build/managed-products/managed-product-page-skeletons";
import { useProductProjectsPage, type LinkedProjectRow } from "./use-product-projects-page";
import { buildProductProjectsColumns, ProductProjectMobileCard } from "./product-projects-table";
import { ProductProjectsToolbar } from "./product-projects-toolbar";

const LinkExistingProjectDialog = dynamic(
  () =>
    import("@/features/build/project-list/link-existing-project-dialog").then(
      (m) => ({ default: m.LinkExistingProjectDialog }),
    ),
  { ssr: false },
);

interface ProductProjectsPageProps {
  managedProductId: number;
}

export function ProductProjectsPage({ managedProductId }: ProductProjectsPageProps) {
  const router = useRouter();
  const page = useProductProjectsPage({ managedProductId });
  const {
    canManage,
    rows,
    hasMore,
    hasPrevious,
    resolution,
    isFilteredEmpty,
    linkDialogOpen,
    setLinkDialogOpen,
    unlinkProjectId,
    unlinkMutation,
    headerActions,
    handleClearFilters,
    handleNextPage,
    handlePreviousPage,
    handleUnlinkClick,
    handleUnlinkConfirm,
    handleUnlinkDialogOpenChange,
    handleRetry,
  } = page;

  const handleRowClick = useCallback(
    (row: LinkedProjectRow) => router.push(`/build/projects/${row.id}`),
    [router],
  );

  const columns = useMemo(
    () => buildProductProjectsColumns({ canManage, onUnlinkClick: handleUnlinkClick }),
    [canManage, handleUnlinkClick],
  );

  const mobileCard = useCallback(
    (row: LinkedProjectRow) => (
      <ProductProjectMobileCard row={row} canManage={canManage} onUnlink={handleUnlinkClick} />
    ),
    [canManage, handleUnlinkClick],
  );

  return (
    <PageWrapper
      title="Linked Projects"
      subtitle="Projects contributing to this product"
      contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}
      filters={
        <ProductProjectsToolbar page={page} />
      }
      actions={<BuildHeaderActions actions={headerActions} />}
    >
      <ManagedProductDetailShell>
        <ManagedProductDetailPrimarySection index={0}>
          <PageState
            resolution={resolution}
            loading={
              <DataTableSkeleton
                mobileCards
                headers={PRODUCT_PROJECT_SKELETON_HEADERS}
              />
            }
            empty={
              isFilteredEmpty ? (
                <EmptyState
                  illustration={<EmptyProjectsIllustration />}
                  title="No projects match filters"
                  filtersActive
                  onClearFilters={handleClearFilters}
                />
              ) : (
                <EmptyState
                  illustration={<EmptyProjectsIllustration />}
                  title="No linked projects yet"
                  description="Link existing projects to this product to track their contribution."
                  action={
                    canManage
                      ? { label: "Link existing project", onClick: () => setLinkDialogOpen(true) }
                      : undefined
                  }
                />
              )
            }
            onRetry={handleRetry}
          >
            <DataTable
              data={rows}
              columns={columns}
              getRowKey={(row) => row.id}
              onRowClick={handleRowClick}
              mobileCard={mobileCard}
              pagination={{
                mode: "cursor",
                pageSize: 20,
                hasMore,
                onNext: handleNextPage,
                hasPrevious,
                onPrevious: handlePreviousPage,
              }}
            />
          </PageState>
        </ManagedProductDetailPrimarySection>
      </ManagedProductDetailShell>

      <ConfirmDialog
        open={unlinkProjectId !== null}
        onOpenChange={handleUnlinkDialogOpenChange}
        title="Unlink project from product?"
        description="The project will be removed from this product's Projects tab. The project itself is not deleted."
        confirmLabel="Unlink"
        destructive
        isPending={unlinkMutation.isPending}
        onConfirm={handleUnlinkConfirm}
      />

      <LinkExistingProjectDialog
        managedProductId={managedProductId}
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
      />
    </PageWrapper>
  );
}
