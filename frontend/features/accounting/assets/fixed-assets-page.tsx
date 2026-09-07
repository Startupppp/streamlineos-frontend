"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared";
import { EmptyReportIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger, TABS_CONTENT_PAGE_BODY_CLASS } from "@/components/ui/tabs";
import { ASSET_STATUS_OPTIONS, isAssetStatusFilter, type AssetStatusFilter } from "./asset-constants";
import { AssetTable } from "./asset-table";
import { CreateAssetSheet, type CreateAssetFormValues } from "./create-asset-sheet";
import { CategoryDialog } from "./category-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import { useAssetCategories, useAssets, useCreateAsset } from "@/hooks/api/accounting/assets";
import type { AssetCategory, AssetListItem } from "@/types/accounting/assets";

function AssetPageActions({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" asChild>
        <Link href="/accounting/assets/depreciation">Depreciation Runs</Link>
      </Button>
      {canCreate && (
        <Button size="sm" onClick={onCreate}>
          <Plus className="mr-1 size-4" />Add Asset
        </Button>
      )}
    </div>
  );
}

interface AssetFiltersProps {
  status: AssetStatusFilter;
  categoryId: string;
  categories: AssetCategory[];
  onStatusChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
}

function AssetFilters({ status, categoryId, categories, onStatusChange, onCategoryChange }: AssetFiltersProps) {
  return (
    <div className={FILTER_TOOLBAR_ROW}>
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className={cn("w-[180px]", FILTER_SELECT_TRIGGER)}><SelectValue /></SelectTrigger>
        <SelectContent>{ASSET_STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={categoryId} onValueChange={onCategoryChange}>
        <SelectTrigger className={cn("w-[180px]", FILTER_SELECT_TRIGGER)}><SelectValue placeholder="All categories" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All categories</SelectItem>
          {categories.map((category) => <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function createCategoryColumns(onEdit: (category: AssetCategory) => void): DataTableColumn<AssetCategory>[] {
  return [
    { key: "name", header: "Name", cell: (category) => <span className="font-medium">{category.name}</span> },
    { key: "defaultMethod", header: "Default Method", cell: (category) => <span className="text-muted-foreground">{category.defaultMethod.replace(/_/g, " ")}</span> },
    { key: "defaultLife", header: "Default Life", cell: (category) => <span className="text-muted-foreground">{category.defaultUsefulLifeMonths == null ? "—" : `${category.defaultUsefulLifeMonths} mo`}</span> },
    { key: "actions", header: "", className: "text-right", cell: (category) => <Button variant="ghost" size="sm" className="text-xs" onClick={() => onEdit(category)}>Edit</Button> },
  ];
}

export function FixedAssetsPage() {
  const router = useRouter();
  const canCreate = useCan("accounting:assets:create");
  const [statusFilter, setStatusFilter] = useState<AssetStatusFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AssetCategory | null>(null);

  const categoriesQuery = useAssetCategories({ limit: 100 });
  const categories = categoriesQuery.data?.data ?? [];
  const assetsQuery = useAssets({
    limit: 100,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    categoryId: categoryFilter === "ALL" ? undefined : Number(categoryFilter),
  });
  const createAsset = useCreateAsset();

  const handleEditCategory = useCallback((category: AssetCategory) => {
    setEditingCategory(category);
    setCategoryDialogOpen(true);
  }, []);

  const categoryColumns = useMemo<DataTableColumn<AssetCategory>[]>(
    () => createCategoryColumns(handleEditCategory),
    [handleEditCategory],
  );

  function handleStatusChange(value: string): void {
    if (isAssetStatusFilter(value)) setStatusFilter(value);
  }

  function handleClearAssetFilters(): void {
    setStatusFilter("ALL");
    setCategoryFilter("ALL");
  }

  const assetFiltersActive = statusFilter !== "ALL" || categoryFilter !== "ALL";

  function handleAssetRowClick(row: AssetListItem): void {
    router.push(`/accounting/assets/${row.asset.id}`);
  }

  function handleCreateAsset(values: CreateAssetFormValues): void {
    createAsset.mutate(
      {
        name: values.name,
        categoryId: values.categoryId,
        acquisitionDate: values.acquisitionDate,
        acquisitionCost: values.acquisitionCost,
        salvageValue: values.salvageValue || "0",
        usefulLifeMonths: values.usefulLifeMonths,
        depreciationMethod: values.depreciationMethod,
        vendorId: values.vendorId,
        billId: values.billId,
      },
      {
        onSuccess: () => { toast.success("Asset created"); setCreateOpen(false); },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleOpenCreateCategory(): void {
    setEditingCategory(null);
    setCategoryDialogOpen(true);
  }

  return (
    <>
      <PageWrapper
        title="Fixed Assets"
        subtitle="Track assets and depreciation"
        actions={<AssetPageActions canCreate={canCreate} onCreate={() => setCreateOpen(true)} />}
      >
        <Tabs defaultValue="assets" className="flex min-h-0 flex-1 flex-col">
          <TabsList>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>
          <TabsContent value="assets" className={TABS_CONTENT_PAGE_BODY_CLASS}>
            <AssetFilters
              status={statusFilter}
              categoryId={categoryFilter}
              categories={categories}
              onStatusChange={handleStatusChange}
              onCategoryChange={setCategoryFilter}
            />
            {assetsQuery.error ? (
              <ErrorState
                title="Failed to load assets"
                description={getErrorMessage(assetsQuery.error)}
                onRetry={() => void assetsQuery.refetch()}
              />
            ) : (
              <AssetTable
                items={assetsQuery.data?.data ?? []}
                isLoading={assetsQuery.isLoading}
                onRowClick={handleAssetRowClick}
                emptyState={
                  <EmptyState
                    illustration={<EmptyReportIllustration />}
                    title="No assets yet"
                    description={
                      assetFiltersActive
                        ? undefined
                        : "Add your first fixed asset to start tracking depreciation."
                    }
                    filtersActive={assetFiltersActive}
                    onClearFilters={handleClearAssetFilters}
                    action={
                      canCreate && !assetFiltersActive
                        ? { label: "Add Asset", onClick: () => setCreateOpen(true) }
                        : undefined
                    }
                  />
                }
              />
            )}
          </TabsContent>
          <TabsContent value="categories" className={TABS_CONTENT_PAGE_BODY_CLASS}>
            <div className="mb-4 flex justify-end">
              {canCreate && (
                <Button size="sm" onClick={handleOpenCreateCategory}>
                  <Plus className="mr-1 size-4" />Add Category
                </Button>
              )}
            </div>
            {categoriesQuery.error ? (
              <ErrorState
                title="Failed to load categories"
                description={getErrorMessage(categoriesQuery.error)}
                onRetry={() => void categoriesQuery.refetch()}
              />
            ) : (
              <DataTable<AssetCategory>
                className="flex-1 min-h-0"
                data={categories}
                columns={categoryColumns}
                getRowKey={(category) => category.id}
                isLoading={categoriesQuery.isLoading}
                minWidth="500px"
                emptyState={
                  <EmptyState
                    illustration={<EmptyReportIllustration />}
                    title="No categories yet"
                    description="Create a category to group your fixed assets."
                    action={canCreate ? { label: "Add Category", onClick: handleOpenCreateCategory } : undefined}
                  />
                }
              />
            )}
          </TabsContent>
        </Tabs>
      </PageWrapper>
      <CreateAssetSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        categories={categories}
        isSubmitting={createAsset.isPending}
        onSubmit={handleCreateAsset}
      />
      <CategoryDialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen} editing={editingCategory} />
    </>
  );
}
