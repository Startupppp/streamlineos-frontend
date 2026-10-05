"use client";

import { useCallback, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL, PmPageShell, PmSection } from "@/components/pm-chrome";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import type { BuildHeaderAction } from "@/features/build/shared/build-header-actions-plan";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import type { ManagedProduct } from "@/types/projects";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import { GalleryCase as SharedGalleryCase } from "@/features/build/shared/build-list-gallery-cases";
import { MANAGED_PRODUCT_GALLERY_ROWS, GALLERY_STUB_ACCESS } from "@/features/build/shared/build-list-fixtures";
import {
  MANAGED_PRODUCT_TABLE_HEADERS,
  buildManagedProductColumns,
  ManagedProductMobileCard,
} from "./managed-product-table-columns";
import { ProductInsightsPage } from "./product-insights-page";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import {
  stubOwnerOf,
  STUB_EDIT,
  STUB_DELETE,
  STUB_CHANGE,
  STATUS_OPTIONS,
  SORT_OPTIONS,
  STUB_INSIGHTS_ID,
  STUB_INSIGHTS_DATA,
} from "./managed-products-gallery-stubs";

export function InsightsReadyFrame() {
  const [queryClient] = useState(() => {
    const client = createAppQueryClient("insights-ready-gallery");
    client.setQueryData(platformCoreQueryKeys.access.me(), GALLERY_STUB_ACCESS);
    client.setQueryData(
      buildWorkQueryKeys.projects.managedProducts.insights(STUB_INSIGHTS_ID),
      STUB_INSIGHTS_DATA,
    );
    return client;
  });
  return (
    <QueryClientProvider client={queryClient}>
      <ProductInsightsPage managedProductId={STUB_INSIGHTS_ID} />
    </QueryClientProvider>
  );
}

export function ManagedProductsReadyTable() {
  const columns = buildManagedProductColumns({
    canManage: true,
    ownerOf: stubOwnerOf,
    onEdit: STUB_EDIT,
    onDelete: STUB_DELETE,
  });

  const renderMobileCard = useCallback(
    (row: ManagedProduct) => (
      <ManagedProductMobileCard
        product={row}
        canManage
        ownerOf={stubOwnerOf}
        onEdit={STUB_EDIT}
        onDelete={STUB_DELETE}
      />
    ),
    [],
  );

  function getRowKey(row: ManagedProduct) { return row.id; }
  function handleNext() { return undefined; }
  function handlePrevious() { return undefined; }

  return (
    <BuildListSurface<ManagedProduct>
      permission="build:managed-products:view"
      rows={MANAGED_PRODUCT_GALLERY_ROWS}
      columns={columns}
      isLoading={false}
      isError={false}
      getRowKey={getRowKey}
      mobileCard={renderMobileCard}
      minWidth="720px"
      pagination={{ mode: "cursor", pageSize: 20, pageNumber: 2, hasMore: true, hasPrevious: true, onNext: handleNext, onPrevious: handlePrevious }}
      empty={<EmptyState className={CONTENT_FILL_PANEL} illustrationPreset="projects" title="No managed products yet" />}
    />
  );
}

export function ManagedProductsGalleryList({
  caseId,
  title,
  actions,
  body,
  navActive,
}: {
  caseId: string;
  title: string;
  actions: BuildHeaderAction[];
  body: React.ReactNode;
  navActive?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("all");
  const handleClearAll = useCallback(() => {
    setSearch("");
    setStatus("all");
    setSort("all");
  }, []);

  return (
    <SharedGalleryCase id={caseId} title={title} navActive={navActive}>
      <PageWrapper
        title="Managed Products"
        subtitle="Track products and link projects to them"
        actions={<BuildHeaderActions actions={actions} />}
        filters={
          <BuildListToolbar
            search={{
              value: search,
              onValueChange: setSearch,
              placeholder: "Search products…",
              label: "Search products",
            }}
            filters={[
              {
                id: "status",
                label: "Status",
                active: status !== "all",
                control: (
                  <BuildFilterSelect
                    label="Status"
                    value={status}
                    onValueChange={setStatus}
                    options={STATUS_OPTIONS}
                  />
                ),
              },
              {
                id: "sort",
                label: "Sort",
                active: sort !== "all",
                control: (
                  <BuildFilterSelect
                    label="Sort"
                    value={sort}
                    onValueChange={setSort}
                    options={SORT_OPTIONS}
                  />
                ),
              },
            ]}
            onClearAll={handleClearAll}
          />
        }
      >
        <PmPageShell>
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
            {body}
          </PmSection>
        </PmPageShell>
      </PageWrapper>
    </SharedGalleryCase>
  );
}

export function ManagedProductsGalleryBase({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => {
    const client = createAppQueryClient("managed-products-gallery");
    client.setQueryData(platformCoreQueryKeys.access.me(), GALLERY_STUB_ACCESS);
    return client;
  });
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
