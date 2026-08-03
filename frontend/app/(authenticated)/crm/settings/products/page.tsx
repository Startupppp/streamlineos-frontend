"use client";

import { useState, useCallback, useTransition, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyProductsIllustration } from "@/components/illustrations";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ErrorState } from "@/components/shared";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/api/crm/products";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import {
  ProductFormSheet,
  type ProductFormValues,
  productValuesFromProduct,
  parseProductPayload,
  defaultProductValues,
} from "@/features/crm/settings/products/product-form";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import type { Product } from "@/types/crm/products";

export default function ProductCatalogPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const debouncedSearch = useDebouncedValue(search, 300);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (debouncedSearch === current) return;
    updateParams({ q: debouncedSearch || null });
  }, [debouncedSearch, searchParams, updateParams]);

  const { data, isLoading, isError, refetch } = useProducts(debouncedSearch.trim() || undefined);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const allProducts = data?.products ?? [];
  const total = data?.total ?? allProducts.length;

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    },
    [],
  );

  const handleOpenCreate = useCallback(() => {
    setEditTarget(null);
    setSheetOpen(true);
  }, []);

  const handleOpenEdit = useCallback((product: Product) => {
    setEditTarget(product);
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setEditTarget(null);
  }, []);

  const handleDeleteRequest = useCallback((id: number) => setDeleteTargetId(id), []);
  const handleDeleteCancel = useCallback(() => setDeleteTargetId(null), []);
  const handleAlertOpenChange = useCallback((open: boolean) => { if (!open) setDeleteTargetId(null); }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTargetId === null) return;
    deleteProduct.mutate(deleteTargetId, {
      onSuccess: () => { toast.success("Product deleted"); setDeleteTargetId(null); },
      onError: (err) => { toast.error(getErrorMessage(err)); setDeleteTargetId(null); },
    });
  }, [deleteProduct, deleteTargetId]);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const onFormSubmit = useCallback(
    (formData: ProductFormValues) => {
      const payload = parseProductPayload(formData);
      if (editTarget) {
        updateProduct.mutate(
          { id: editTarget.id, ...payload },
          {
            onSuccess: () => { toast.success("Product updated"); setSheetOpen(false); setEditTarget(null); },
            onError: (err) => toast.error(getErrorMessage(err)),
          },
        );
      } else {
        createProduct.mutate(payload, {
          onSuccess: () => { toast.success("Product created"); setSheetOpen(false); },
          onError: (err) => toast.error(getErrorMessage(err)),
        });
      }
    },
    [editTarget, updateProduct, createProduct],
  );

  const handleEditRow = useCallback((product: Product) => handleOpenEdit(product), [handleOpenEdit]);
  const handleDeleteRow = useCallback((id: number) => handleDeleteRequest(id), [handleDeleteRequest]);

  const columns: DataTableColumn<Product>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (p) => p.name,
      cell: (p) => (
        <div>
          <p className="font-medium text-sm">{p.name}</p>
          {p.description && (
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{p.description}</p>
          )}
        </div>
      ),
    },
    {
      key: "sku",
      header: "SKU",
      cell: (p) =>
        p.sku ? (
          <span className="font-mono text-xs">{p.sku}</span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: "category",
      header: "Category",
      cell: (p) => <span className="text-sm">{p.category ?? "—"}</span>,
    },
    {
      key: "unitPrice",
      header: "Unit Price",
      sortable: true,
      sortValue: (p) => p.unitPrice,
      cell: (p) => (
        <span className="text-sm">
          {p.currency} {p.unitPrice.toLocaleString()}
        </span>
      ),
    },
    {
      key: "taxRate",
      header: "Tax Rate",
      cell: (p) => <span className="text-sm">{p.taxRate}%</span>,
    },
    {
      key: "isActive",
      header: "Status",
      cell: (p) =>
        p.isActive ? (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
            Inactive
          </Badge>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleEditRow(p)} aria-label="Edit product">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteRow(p.id)}
            className="text-destructive hover:text-destructive"
            aria-label="Delete product"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const isPending = createProduct.isPending || updateProduct.isPending;
  const formInitialValues = editTarget ? productValuesFromProduct(editTarget) : defaultProductValues;

  return (
    <>
      <AlertDialog open={deleteTargetId !== null} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              This product will be permanently deleted and removed from all quotes and deals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProductFormSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        editTarget={editTarget}
        onSubmit={onFormSubmit}
        isPending={isPending}
        initialValues={formInitialValues}
      />

      <PageWrapper
        title="Product Catalog"
        subtitle={isLoading ? "Loading..." : `${total} product${total !== 1 ? "s" : ""}`}
        actions={
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        }
        filters={
          <div className={FILTER_TOOLBAR_ROW}>
            <SearchInput placeholder="Search products..." value={search} onValueChange={handleSearchChange} />
          </div>
        }
      >
        {isError ? (
          <ErrorState title="Failed to load products" onRetry={handleRetry} className="flex-1" />
        ) : (
          <DataTable
            data={allProducts}
            columns={columns}
            getRowKey={(p) => p.id}
            isLoading={isLoading}
            className="flex-1 min-h-0"
            emptyState={
              <EmptyState
                className="flex-1 border-0 bg-transparent"
                illustration={<EmptyProductsIllustration />}
                title={debouncedSearch ? "No products match your search" : "No products yet"}
                description={
                  debouncedSearch
                    ? "Try a different search term."
                    : "Add products and services to use in your quotes and deals."
                }
                action={debouncedSearch ? undefined : { label: "Add Product", onClick: handleOpenCreate }}
              />
            }
          />
        )}
      </PageWrapper>
    </>
  );
}
