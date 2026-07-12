"use client";

import { useState, useCallback } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState, ErrorState } from "@/components/shared";
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
  categoryId: z.coerce.number().min(1, "Category is required"),
  acquisitionDate: z.string().min(1, "Date is required"),
  acquisitionCost: z.string().min(1, "Cost is required"),
  salvageValue: z.string().default("0"),
  usefulLifeMonths: z.coerce.number().min(1, "Useful life is required"),
  depreciationMethod: z.enum(["STRAIGHT_LINE", "DECLINING_BALANCE", "UNITS_OF_PRODUCTION"]),
  vendorId: z.coerce.number().optional(),
  billId: z.coerce.number().optional(),
});

type CreateAssetFormValues = z.infer<typeof createAssetSchema>;

const ASSET_STATUS_CLASSES: Record<AssetStatus, string> = {
  DRAFT: "bg-blue-50 text-blue-700 border-blue-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FULLY_DEPRECIATED: "bg-slate-100 text-slate-700 border-slate-200",
  DISPOSED: "bg-red-50 text-red-700 border-red-200",
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

  function handleStatusChange(value: string): void {
    setStatusFilter(value as StatusFilter);
  }

  function handleCategoryFilterChange(value: string): void {
    setCategoryFilter(value);
  }

  function handleRowClick(assetId: number): void {
    router.push(`/accounting/assets/${assetId}`);
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
        <Tabs defaultValue="assets">
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

            {assetsQuery.isLoading && <LoadingState variant="table" rows={8} />}
            {assetsQuery.error && (
              <ErrorState
                title="Failed to load assets"
                description={getErrorMessage(assetsQuery.error)}
                onRetry={handleAssetsRetry}
              />
            )}
            {!assetsQuery.isLoading && !assetsQuery.error && assetItems.length === 0 && (
              <EmptyState
                illustration={<EmptyReportIllustration />}
                title="No assets yet"
                description="Add your first fixed asset to start tracking depreciation."
                action={canCreate ? { label: "Add Asset", onClick: () => setCreateOpen(true) } : undefined}
              />
            )}
            {assetItems.length > 0 && (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <Table className="min-w-[820px]">
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Asset #</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Name</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 hidden md:table-cell">Category</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 hidden md:table-cell">Acquired</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 text-right">Cost</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 text-right hidden lg:table-cell">Accum. Depr.</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 text-right hidden lg:table-cell">Book Value</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assetItems.map(({ asset, categoryName }) => {
                        const bookValue = Math.max(
                          0,
                          parseFloat(asset.acquisitionCost) - parseFloat(asset.accumulatedDepreciation),
                        );
                        return (
                          <TableRow
                            key={asset.id}
                            className="border-b border-border/50 hover:bg-muted/30 cursor-pointer"
                            onClick={() => handleRowClick(asset.id)}
                          >
                            <TableCell className="font-mono text-xs px-3 py-2">{asset.assetNumber}</TableCell>
                            <TableCell className="text-sm font-medium px-3 py-2">
                              <Link
                                href={`/accounting/assets/${asset.id}`}
                                className="text-foreground hover:text-blue-600 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {asset.name}
                              </Link>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground px-3 py-2 hidden md:table-cell">
                              {categoryName ?? "—"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground px-3 py-2 hidden md:table-cell">
                              {formatDate(asset.acquisitionDate)}
                            </TableCell>
                            <TableCell className="text-sm text-right px-3 py-2">
                              <Money value={parseFloat(asset.acquisitionCost)} />
                            </TableCell>
                            <TableCell className="text-sm text-right px-3 py-2 hidden lg:table-cell">
                              <Money value={parseFloat(asset.accumulatedDepreciation)} />
                            </TableCell>
                            <TableCell className="text-sm text-right px-3 py-2 hidden lg:table-cell">
                              <Money value={bookValue} />
                            </TableCell>
                            <TableCell className="px-3 py-2">
                              <AssetStatusBadge status={asset.status} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
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
            {categoriesQuery.isLoading && <LoadingState variant="table" rows={5} />}
            {categoriesQuery.error && (
              <ErrorState
                title="Failed to load categories"
                description={getErrorMessage(categoriesQuery.error)}
                onRetry={handleCategoriesRetry}
              />
            )}
            {!categoriesQuery.isLoading && !categoriesQuery.error && categories.length === 0 && (
              <EmptyState
                illustration={<EmptyReportIllustration />}
                title="No categories yet"
                description="Create a category to group your fixed assets."
                action={canCreate ? { label: "Add Category", onClick: handleOpenCreateCategory } : undefined}
              />
            )}
            {categories.length > 0 && (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <Table className="min-w-[500px]">
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Name</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 hidden md:table-cell">Default Method</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 hidden md:table-cell">Default Life</TableHead>
                        <TableHead className="w-16 px-3 py-2" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((cat) => (
                        <TableRow key={cat.id} className="border-b border-border/50 hover:bg-muted/30">
                          <TableCell className="text-sm font-medium px-3 py-2">{cat.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground px-3 py-2 hidden md:table-cell">
                            {cat.defaultMethod.replace(/_/g, " ")}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground px-3 py-2 hidden md:table-cell">
                            {cat.defaultUsefulLifeMonths != null ? `${cat.defaultUsefulLifeMonths} mo` : "—"}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleEditCategory(cat)}
                            >
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PageWrapper>

      <EntityFormSheet
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
                <Input id="asset-life" type="number" min={1} {...form.register("usefulLifeMonths")} placeholder="60" />
                {form.formState.errors.usefulLifeMonths && (
                  <p className="text-xs text-destructive">{form.formState.errors.usefulLifeMonths.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Depreciation Method</Label>
                <Select
                  value={form.watch("depreciationMethod")}
                  onValueChange={(v) => form.setValue("depreciationMethod", v as DepreciationMethod)}
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
