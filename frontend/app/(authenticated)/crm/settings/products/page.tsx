"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyProductsIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import { CONTENT_FILL_PANEL, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { RecordList, asRecordValues } from "@/components/renderer";
import { DensityToggle, useDensity } from "@/components/renderer/density-toggle";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { RecordRowActions } from "@/features/crm/settings/shared/record-row-actions";
import { ProductSheet } from "@/features/crm/settings/products/product-sheet";
import { useCan } from "@/hooks/api/access";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useDeleteProduct, useProducts } from "@/hooks/api/crm/products";
import { getErrorMessage } from "@/lib/get-error-message";
import { PRODUCT_LAYOUT } from "@/lib/renderer/crm/settings/product-layout";
import { toast } from "sonner";
import type { Product } from "@/types/crm/products";

/**
 * The product catalogue.
 *
 * No columns are written here. Their labels, their alignment, the currency each
 * price renders in and the mobile card all come from `PRODUCT_LAYOUT` — the same
 * description the create and edit sheet validates against, so the table cannot
 * claim a product has a field the form has never heard of.
 *
 * What is left is what a description cannot say: the one filter this domain has,
 * who may add a product, and that deleting one is irreversible.
 */
export default function ProductCatalogPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const layout = useTenantLayout(PRODUCT_LAYOUT);
  const money = useOrgDisplay();
  const [density, setDensity] = useDensity();
  const canManage = useCan("crm:products:manage");

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (debouncedSearch === current) return;
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) params.set("q", debouncedSearch);
    else params.delete("q");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [debouncedSearch, searchParams, router, pathname]);

  const query = debouncedSearch.trim();
  const { data, isLoading, isError, refetch, access} = useProducts(query || undefined);
  const deleteProduct = useDeleteProduct();

  // Memoised because a row renderer depends on it; a fresh [] each render
  // would rebuild every row of the catalogue on every keystroke of the search.
  const products = useMemo(() => data?.products ?? [], [data?.products]);

  const handleOpenCreate = useCallback(() => {
    setEditTarget(null);
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setEditTarget(null);
  }, []);

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleClearSearch = useCallback(() => setSearch(""), []);
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteProduct.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Product deleted");
        setDeleteTarget(null);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeleteTarget(null);
      },
    });
  }, [deleteProduct, deleteTarget]);

  const rowActions = useCallback(
    (row: Record<string, unknown>) => {
      const product = products.find((candidate) => candidate.id === row.id);
      if (!product || !canManage) return null;
      return (
        <RecordRowActions
          editLabel={`Edit ${product.name}`}
          deleteLabel={`Delete ${product.name}`}
          onEdit={() => {
            setEditTarget(product);
            setSheetOpen(true);
          }}
          onDelete={() => setDeleteTarget(product)}
        />
      );
    },
    [products, canManage],
  );

  return (
    <PageWrapper
      title="Product catalogue"
      subtitle="What you sell, what it costs and how it is taxed."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <SearchInput
            placeholder={layout.list.searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <DensityToggle density={density} onChange={setDensity} />
        </div>
      }
      actions={
        canManage ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
            size="sm"
            onClick={handleOpenCreate}
          >
            New product
          </AnimatedIconButton>
        ) : undefined
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!canManage ? (
          <NoPermissionState
            permission="crm:products:manage"
            className={CONTENT_FILL_PANEL}
            description="The product catalogue is managed by whoever sets your pricing."
          />
        ) : isLoading ? (
          <DataTableSkeleton rows={12} columns={layout.list.columns.length} className="flex-1" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load the catalogue"
            description="The product list didn't load. Check your connection and try again."
            onRetry={handleRetry}
            className={CONTENT_FILL_PANEL}
          />
        ) : products.length === 0 ? (
          <EmptyState
            access={access}
            illustration={<EmptyProductsIllustration />}
            title={query ? "No products match that search" : "No products yet"}
            description={
              query
                ? `Nothing in the catalogue matches "${query}". Clear the search to see everything.`
                : "A product is a line you can put on a quote — its price, its tax and the currency it sells in."
            }
            action={
              query
                ? { label: "Clear search", onClick: handleClearSearch }
                : canManage
                  ? { label: "New product", onClick: handleOpenCreate }
                  : undefined
            }
            actionVariant={query ? "outline" : undefined}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <RecordList
            layout={layout}
            rows={asRecordValues(products)}
            getRowKey={(row) => String(row.id)}
            actions={canManage ? rowActions : undefined}
            density={density}
            money={money}
            minWidth="900px"
            className={CONTENT_FILL_PANEL}
          />
        )}
      </div>

      <ProductSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        product={editTarget}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
        title="Delete this product?"
        description={
          deleteTarget
            ? `${deleteTarget.name} will be removed from the catalogue and from every quote and deal that lists it. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete product"
        destructive
        isPending={deleteProduct.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
