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
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { EmptyProjectsIllustration } from "@/components/illustrations";
import {
  MANAGED_PRODUCT_DETAIL_CONTENT_CLASS,
  ManagedProductDetailPrimarySection,
  ManagedProductDetailShell,
} from "@/features/build/managed-products/managed-product-detail-layout";
import { PRODUCT_PROJECT_SKELETON_HEADERS } from "@/features/build/managed-products/managed-product-page-skeletons";
import { useProductProjectsPage, type LinkedProjectRow } from "./use-product-projects-page";
import {
  STATUS_OPTIONS,
  HEALTH_OPTIONS,
  ALL_SENTINEL,
  CONTRIB_OPTIONS,
  buildProductProjectsColumns,
  ProductProjectMobileCard,
} from "./product-projects-table";

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
  const {
    canManage,
    rows,
    hasMore,
    hasPrevious,
    resolution,
    isFiltered,
    isFilteredEmpty,
    statusValue,
    healthValue,
    teamValue,
    clientValue,
    contribValue,
    teamOptions,
    clientOptions,
    searchValue,
    searchInputRef,
    linkDialogOpen,
    setLinkDialogOpen,
    unlinkProjectId,
    unlinkMutation,
    headerActions,
    handleStatusChange,
    handleHealthChange,
    handleTeamChange,
    handleClientChange,
    handleContribChange,
    handleSearchChange,
    handleClearFilters,
    handleNextPage,
    handlePreviousPage,
    handleUnlinkClick,
    handleUnlinkConfirm,
    handleUnlinkDialogOpenChange,
    handleRetry,
  } = useProductProjectsPage({ managedProductId });

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
        <BuildListToolbar
          search={{
            value: searchValue,
            onValueChange: handleSearchChange,
            placeholder: "Search projects…",
            label: "Search projects",
            inputRef: searchInputRef,
          }}
          filters={[
            {
              id: "status",
              label: "Status",
              active: Boolean(statusValue),
              control: (
                <BuildFilterSelect
                  label="Status"
                  value={statusValue || ALL_SENTINEL}
                  onValueChange={(v) => handleStatusChange(v === ALL_SENTINEL ? "" : v)}
                  options={[{ value: ALL_SENTINEL, label: "All statuses" }, ...STATUS_OPTIONS]}
                />
              ),
            },
            {
              id: "health",
              label: "Health",
              active: Boolean(healthValue),
              control: (
                <BuildFilterSelect
                  label="Health"
                  value={healthValue || ALL_SENTINEL}
                  onValueChange={(v) => handleHealthChange(v === ALL_SENTINEL ? "" : v)}
                  options={[{ value: ALL_SENTINEL, label: "Any health" }, ...HEALTH_OPTIONS]}
                />
              ),
            },
            {
              id: "team",
              label: "Team",
              active: Boolean(teamValue),
              control: (
                <BuildFilterSelect
                  label="Team"
                  value={teamValue || ALL_SENTINEL}
                  onValueChange={(v) => handleTeamChange(v === ALL_SENTINEL ? "" : v)}
                  options={[{ value: ALL_SENTINEL, label: "All teams" }, ...teamOptions]}
                />
              ),
            },
            {
              id: "customer",
              label: "Customer",
              active: Boolean(clientValue),
              control: (
                <BuildFilterSelect
                  label="Customer"
                  value={clientValue || ALL_SENTINEL}
                  onValueChange={(v) => handleClientChange(v === ALL_SENTINEL ? "" : v)}
                  options={[{ value: ALL_SENTINEL, label: "All customers" }, ...clientOptions]}
                />
              ),
            },
            {
              id: "contribution",
              label: "Contribution",
              active: Boolean(contribValue),
              control: (
                <BuildFilterSelect
                  label="Contribution"
                  value={contribValue || ALL_SENTINEL}
                  onValueChange={(v) => handleContribChange(v === ALL_SENTINEL ? "" : v)}
                  options={[{ value: ALL_SENTINEL, label: "Any contribution" }, ...CONTRIB_OPTIONS]}
                />
              ),
            },
          ]}
          onClearAll={isFiltered ? handleClearFilters : undefined}
        />
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
