"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { EmptyReportIllustration } from "@/components/illustrations";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/features/accounting/shared";
import { CategoryDialog } from "@/features/accounting/assets/category-dialog";
import { useCan } from "@/hooks/api/access";
import {
  useAssets,
  useAssetCategories,
  useCreateAsset,
} from "@/hooks/api/accounting/assets";
import { getErrorMessage } from "@/lib/get-error-message";
import type {
  AssetStatus,
  AssetCategory,
  AssetListItem,
  DepreciationMethod,
} from "@/types/accounting/assets";

type StatusFilter = "ALL" | AssetStatus;

const STATUS_OPTIONS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "FULLY_DEPRECIATED", label: "Fully Depreciated" },
  { value: "DISPOSED", label: "Disposed" },
];

const METHOD_OPTIONS: ReadonlyArray<{ value: DepreciationMethod; label: string }> = [
  { value: "STRAIGHT_LINE", label: "Straight Line" },
  { value: "DECLINING_BALANCE", label: "Declining Balance" },
  { value: "UNITS_OF_PRODUCTION", label: "Units of Production" },
];

const createAssetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.number().min(1, "Category is required"),
  acquisitionDate: z.string().min(1, "Date is required"),
  acquisitionCost: z.string().min(1, "Cost is required"),
  salvageValue: z.string(),
  usefulLifeMonths: z.number().min(1, "Useful life is required"),
  depreciationMethod: z.enum(["STRAIGHT_LINE", "DECLINING_BALANCE", "UNITS_OF_PRODUCTION"]),
  vendorId: z.number().optional(),
  billId: z.number().optional(),
});

type CreateAssetFormValues = z.infer<typeof createAssetSchema>;

const ASSET_STATUS_CLASSES: Record<AssetStatus, string> = {
  DRAFT: "bg-primary/5 text-foreground border-primary/20",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  FULLY_DEPRECIATED: "bg-muted text-foreground border-border",
  DISPOSED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
};

const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  FULLY_DEPRECIATED: "Fully Deprecated",
  DISPOSED: "Disposed",
};

function AssetStatusBadge({ status }: { status: AssetStatus }) {
  return (
    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${ASSET_STATUS_CLASSES[status]}`}>
      {ASSET_STATUS_LABELS[status]}
    </Badge>
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function isStatusFilter(value: string): value is StatusFilter {
  return STATUS_OPTIONS.some((opt) => opt.value === value);
}

function isDepreciationMethod(value: string): value is DepreciationMethod {
  return METHOD_OPTIONS.some((opt) => opt.value === value);
}

const ASSET_COLUMNS: DataTableColumn<AssetListItem>[] = [
  {
    key: "assetNumber",
    header: "Asset #",
    cell: (row) => <span className="font-mono text-xs">{row.asset.assetNumber}</span>,
  },
  {
    key: "name",
    header: "Name",
    cell: (row) => (
      <Link
        href={`/accounting/assets/${row.asset.id}`}
        className="text-foreground hover:text-primary hover:underline font-medium"
        onClick={(e) => e.stopPropagation()}
      >
        {row.asset.name}
      </Link>
    ),
  },
  {
    key: "category",
    header: "Category",
    cell: (row) => <span className="text-muted-foreground">{row.categoryName ?? "—"}</span>,
  },
  {
    key: "acquired",
    header: "Acquired",
    cell: (row) => <span className="text-muted-foreground">{formatDate(row.asset.acquisitionDate)}</span>,
  },
  {
    key: "cost",
    header: "Cost",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => <Money value={parseFloat(row.asset.acquisitionCost)} />,
  },
  {
    key: "accumDepr",
    header: "Accum. Depr.",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => <Money value={parseFloat(row.asset.accumulatedDepreciation)} />,
  },
  {
    key: "bookValue",
    header: "Book Value",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => {
      const bookValue = Math.max(
        0,
        parseFloat(row.asset.acquisitionCost) - parseFloat(row.asset.accumulatedDepreciation),
      );
      return <Money value={bookValue} />;
    },
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <AssetStatusBadge status={row.asset.status} />,
  },
];

export default function FixedAssetsPage() {
  const router = useRouter();
  const canCreate = useCan("accounting:assets:create");

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AssetCategory | null>(null);

  const categoriesQuery = useAssetCategories({ pageSize: 100 });
  const categories = categoriesQuery.data?.items ?? [];

  const assetsQuery = useAssets({
    pageSize: 100,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    categoryId: categoryFilter !== "ALL" ? Number(categoryFilter) : undefined,
  });
  const assetItems = assetsQuery.data?.items ?? [];

  const createAsset = useCreateAsset();

  const categoryColumns = useMemo<DataTableColumn<AssetCategory>[]>(
    () => [
      {
        key: "name",
        header: "Name",
        cell: (row) => <span className="font-medium">{row.name}</span>,
      },
      {
        key: "defaultMethod",
        header: "Default Method",
        cell: (row) => (
          <span className="text-muted-foreground">{row.defaultMethod.replace(/_/g, " ")}</span>
        ),
      },
      {
        key: "defaultLife",
        header: "Default Life",
        cell: (row) => (
          <span className="text-muted-foreground">
            {row.defaultUsefulLifeMonths != null ? `${row.defaultUsefulLifeMonths} mo` : "—"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        className: "text-right",
        cell: (row) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => handleEditCategory(row)}
          >
            Edit
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function handleStatusChange(value: string): void {
    if (isStatusFilter(value)) setStatusFilter(value);
  }

  function handleCategoryFilterChange(value: string): void {
    setCategoryFilter(value);
  }

  function handleAssetRowClick(row: AssetListItem): void {
    router.push(`/accounting/assets/${row.asset.id}`);
  }

  function handleCreateAsset(values: CreateAssetFormValues): void {
    createAsset.mutate(
      {
        name: values.name,
        categoryId: values.categoryId,
        acquisitionDate: values.acquisitionDate,
        acquisitionCost: parseFloat(values.acquisitionCost),
        salvageValue: parseFloat(values.salvageValue ?? "0"),
        usefulLifeMonths: values.usefulLifeMonths,
        depreciationMethod: values.depreciationMethod,
        vendorId: values.vendorId,
        billId: values.billId,
      },
      {
        onSuccess: () => {
          toast.success("Asset created");
          setCreateOpen(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleAssetsRetry(): void {
    void assetsQuery.refetch();
  }

  function handleCategoriesRetry(): void {
    void categoriesQuery.refetch();
  }

  function handleOpenCreateCategory(): void {
    setEditingCategory(null);
    setCategoryDialogOpen(true);
  }

  const handleEditCategory = useCallback((cat: AssetCategory) => {
    setEditingCategory(cat);
    setCategoryDialogOpen(true);
  }, []);

  function getAssetRowKey(row: AssetListItem): number {
    return row.asset.id;
  }

  function getCategoryRowKey(row: AssetCategory): number {
    return row.id;
  }

  return (
    <>
      <PageWrapper
        eyebrow="Accounting"
        title="Fixed Assets"
        subtitle="Track assets and depreciation"
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href="/accounting/assets/depreciation">Depreciation Runs</Link>
            </Button>
            {canCreate && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4 mr-1" />
                Add Asset
              </Button>
            )}
          </div>
        }
      >
        <Tabs defaultValue="assets" className="flex flex-1 min-h-0 flex-col">
          <TabsList className="mb-4">
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="assets">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-8 w-[180px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={handleCategoryFilterChange}>
                <SelectTrigger className="h-8 w-[180px] text-xs">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {assetsQuery.error && (
              <ErrorState
                title="Failed to load assets"
                description={getErrorMessage(assetsQuery.error)}
                onRetry={handleAssetsRetry}
              />
            )}
            {!assetsQuery.error && (
              <DataTable<AssetListItem>
                className="flex-1 min-h-0"
                data={assetItems}
                columns={ASSET_COLUMNS}
                getRowKey={getAssetRowKey}
                onRowClick={handleAssetRowClick}
                isLoading={assetsQuery.isLoading}
                minWidth="820px"
                emptyState={
                  <EmptyState
                    illustration={<EmptyReportIllustration />}
                    title="No assets yet"
                    description="Add your first fixed asset to start tracking depreciation."
                    action={canCreate ? { label: "Add Asset", onClick: () => setCreateOpen(true) } : undefined}
                  />
                }
              />
            )}
          </TabsContent>

          <TabsContent value="categories">
            <div className="flex justify-end mb-4">
              {canCreate && (
                <Button size="sm" onClick={handleOpenCreateCategory}>
                  <Plus className="size-4 mr-1" />
                  Add Category
                </Button>
              )}
            </div>
            {categoriesQuery.error && (
              <ErrorState
                title="Failed to load categories"
                description={getErrorMessage(categoriesQuery.error)}
                onRetry={handleCategoriesRetry}
              />
            )}
            {!categoriesQuery.error && (
              <DataTable<AssetCategory>
                className="flex-1 min-h-0"
                data={categories}
                columns={categoryColumns}
                getRowKey={getCategoryRowKey}
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

      <EntityFormSheet<CreateAssetFormValues>
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add Fixed Asset"
        description="Record a new fixed asset for depreciation tracking."
        resolver={zodResolver(createAssetSchema)}
        defaultValues={{
          name: "",
          categoryId: 0,
          acquisitionDate: "",
          acquisitionCost: "",
          salvageValue: "0",
          usefulLifeMonths: 60,
          depreciationMethod: "STRAIGHT_LINE",
        }}
        onSubmit={handleCreateAsset}
        isSubmitting={createAsset.isPending}
        submitLabel="Create Asset"
        resetOnOpen
      >
        {(form) => (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="asset-name">Name</Label>
              <Input id="asset-name" {...form.register("name")} placeholder="e.g. Office Laptop" />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={String(form.watch("categoryId") || "")}
                onValueChange={(v) => form.setValue("categoryId", Number(v))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.categoryId && (
                <p className="text-xs text-destructive">{form.formState.errors.categoryId.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="asset-date">Acquisition Date</Label>
              <Input id="asset-date" type="date" {...form.register("acquisitionDate")} />
              {form.formState.errors.acquisitionDate && (
                <p className="text-xs text-destructive">{form.formState.errors.acquisitionDate.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="asset-cost">Acquisition Cost</Label>
                <Input id="asset-cost" type="number" min={0} step="0.01" {...form.register("acquisitionCost")} placeholder="0.00" />
                {form.formState.errors.acquisitionCost && (
                  <p className="text-xs text-destructive">{form.formState.errors.acquisitionCost.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asset-salvage">Salvage Value</Label>
                <Input id="asset-salvage" type="number" min={0} step="0.01" {...form.register("salvageValue")} placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="asset-life">Useful Life (months)</Label>
                <Input id="asset-life" type="number" min={1} {...form.register("usefulLifeMonths", { valueAsNumber: true })} placeholder="60" />
                {form.formState.errors.usefulLifeMonths && (
                  <p className="text-xs text-destructive">{form.formState.errors.usefulLifeMonths.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Depreciation Method</Label>
                <Select
                  value={form.watch("depreciationMethod")}
                  onValueChange={(v) => { if (isDepreciationMethod(v)) form.setValue("depreciationMethod", v); }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METHOD_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}
      </EntityFormSheet>

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        editing={editingCategory}
      />
    </>
  );
}
