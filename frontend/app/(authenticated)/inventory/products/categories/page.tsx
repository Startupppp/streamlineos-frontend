"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Pencil,
  Archive,
  RotateCcw,
} from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  EmptyProductsIllustration,
  EmptySearchIllustration,
} from "@/components/illustrations";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
} from "@/hooks/api/inventory";
import { CategoryEditSheet } from "@/features/inventory/components/category-edit-sheet";
import type { InventoryCategory } from "@/types/inventory";

const NO_PARENT = "none";

const CATEGORY_NAME_MIN = 2;
const CATEGORY_NAME_MAX = 100;
const CATEGORY_DESC_MAX = 500;
const VALID_NAME_RE = /[a-zA-Z0-9]/;

const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required.")
    .max(
      CATEGORY_NAME_MAX,
      `Name must be ${CATEGORY_NAME_MAX} characters or fewer.`,
    )
    .refine(
      (v) => v.trim().length >= CATEGORY_NAME_MIN,
      `Name must be at least ${CATEGORY_NAME_MIN} characters.`,
    )
    .refine(
      (v) => VALID_NAME_RE.test(v.trim()),
      "Name must contain at least one letter or number.",
    ),
  description: z
    .string()
    .max(
      CATEGORY_DESC_MAX,
      `Description must be ${CATEGORY_DESC_MAX} characters or fewer.`,
    )
    .optional(),
  parentId: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

function CreateCategoryForm({
  categories,
  onSuccess,
}: {
  categories: InventoryCategory[];
  onSuccess: () => void;
}) {
  const createMutation = useCreateCategory();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", description: "", parentId: NO_PARENT },
  });

  async function onSubmit(values: CategoryFormValues): Promise<void> {
    const trimmedName = values.name.trim();
    try {
      await createMutation.mutateAsync({
        name: trimmedName,
        description: values.description?.trim() || undefined,
        parentCategoryId:
          values.parentId === NO_PARENT ? undefined : Number(values.parentId),
      });
      toast.success(`Category "${trimmedName}" created`);
      form.reset();
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Name</FormLabel>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {field.value.length}/{CATEGORY_NAME_MAX}
                  </span>
                </div>
                <FormControl>
                  <Input
                    placeholder="e.g. Electronics"
                    maxLength={CATEGORY_NAME_MAX}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="parentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parent Category</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="None (top-level)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_PARENT}>None (top-level)</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="sm:col-span-2">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Description</FormLabel>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {(field.value ?? "").length}/{CATEGORY_DESC_MAX}
                    </span>
                  </div>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="Optional description"
                      maxLength={CATEGORY_DESC_MAX}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <LoadingButton
            type="submit"
            size="sm"
            isPending={createMutation.isPending}
            loadingText="Creating…"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Category
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}

function categoriesColumns(
  categoryNameById: Map<number, string>,
  onEdit: (cat: InventoryCategory) => void,
  onArchiveToggle: (cat: InventoryCategory) => void,
): DataTableColumn<InventoryCategory>[] {
  return [
    {
      key: "name",
      header: "Name",
      cell: (cat) => (
        <div className="flex items-center gap-2 font-medium text-foreground">
          {cat.name}
          {!cat.isActive && (
            <Badge
              variant="outline"
              className="h-4 text-[9px] px-1.5 py-0 border-border text-muted-foreground bg-muted"
            >
              Archived
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "parentCategory",
      header: "Parent",
      headerClassName: "w-[180px]",
      cell: (cat) => (
        <span className="text-muted-foreground">
          {cat.parentCategoryId != null
            ? (categoryNameById.get(cat.parentCategoryId) ?? "—")
            : "—"}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (cat) => (
        <span className="text-muted-foreground max-w-xs truncate block">
          {cat.description ?? "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-8",
      className: "w-8",
      cell: (cat) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <AnimatedIconButton
              icon={EllipsisIcon}
              iconSize={16}
              variant="ghost"
              size="icon"
              className="w-7"
              aria-label={`Actions for ${cat.name}`}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(cat)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onArchiveToggle(cat)}
              variant={cat.isActive ? "destructive" : "default"}
            >
              {cat.isActive ? (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}

function CategoriesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formKey, setFormKey] = useState<number>(0);
  const [editingCategory, setEditingCategory] =
    useState<InventoryCategory | null>(null);

  const statusParam = searchParams.get("status") ?? "all";

  const [searchInput, setSearchInput] = useState<string>(
    searchParams.get("search") ?? "",
  );
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const query = useCategories();
  const updateMutation = useUpdateCategory();
  const categories = query.data ?? [];

  const filteredCategories = categories.filter((cat) => {
    const term = debouncedSearch.trim().toLowerCase();
    const matchesSearch = !term || cat.name.toLowerCase().includes(term);
    const matchesStatus =
      statusParam === "all" ||
      (statusParam === "active" && cat.isActive) ||
      (statusParam === "archived" && !cat.isActive);
    return matchesSearch && matchesStatus;
  });

  const categoryNameById = new Map(categories.map((cat) => [cat.id, cat.name]));

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
  }

  useEffect(() => {
    const trimmed = debouncedSearch.trim() || null;
    const current = searchParams.get("search") ?? null;
    if (trimmed !== current) {
      updateParams({ search: trimmed });
    }
  }, [debouncedSearch]);

  function handleStatusChange(value: string): void {
    updateParams({ status: value });
  }

  function handleFormSuccess(): void {
    setFormKey((k) => k + 1);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  function handleEditOpen(cat: InventoryCategory): void {
    setEditingCategory(cat);
  }

  function handleEditClose(): void {
    setEditingCategory(null);
  }

  async function handleArchiveToggle(cat: InventoryCategory): Promise<void> {
    try {
      await updateMutation.mutateAsync({
        categoryId: cat.id,
        data: { isActive: !cat.isActive },
      });
      toast.success(cat.isActive ? "Category archived" : "Category restored");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const hasFilters = !!(
    searchInput.trim() ||
    (statusParam && statusParam !== "all")
  );

  const filtersRow = (
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
      <div className="min-w-0 flex-1 lg:max-w-sm w-full">
          <SearchInput value={searchInput} onValueChange={handleSearchChange} placeholder="Search categories..." />
        </div>
      <div className="hidden min-w-0 items-center gap-2 sm:flex">
        <Select value={statusParam} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[140px] text-xs">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <PageWrapper
      title="Categories"
      subtitle={
        categories.length > 0
          ? `${categories.length} ${categories.length === 1 ? "category" : "categories"}`
          : "Organise products into categories and sub-categories."
      }
      filters={filtersRow}
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Add Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CreateCategoryForm
              key={formKey}
              categories={categories}
              onSuccess={handleFormSuccess}
            />
          </CardContent>
        </Card>

        {query.error ? (
          <ErrorState
            title="Failed to load categories"
            description={query.error.message}
            onRetry={handleRetry}
          />
        ) : (
          <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
            <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
              <DataTable
                data={filteredCategories}
                getRowKey={(cat) => cat.id}
                isLoading={query.isLoading}
                rowClassName={(cat) => (!cat.isActive ? "opacity-60" : "")}
                emptyState={
                  <InventoryEmptyState
                    illustration={
                      hasFilters ? (
                        <EmptySearchIllustration />
                      ) : (
                        <EmptyProductsIllustration />
                      )
                    }
                    title={
                      hasFilters ? "No categories found" : "No categories yet"
                    }
                    description={
                      hasFilters
                        ? "Try adjusting your search or filters."
                        : "Use the form above to add your first product category."
                    }
                    className="border-0 bg-transparent"
                  />
                }
                columns={categoriesColumns(
                  categoryNameById,
                  handleEditOpen,
                  handleArchiveToggle,
                )}
                minWidth="560px"
              />
            </CardContent>
          </Card>
        )}
      </div>

      {editingCategory !== null && (
        <CategoryEditSheet
          key={editingCategory.id}
          category={editingCategory}
          categories={categories}
          open
          onClose={handleEditClose}
        />
      )}
    </PageWrapper>
  );
}

export default function CategoriesPage() {
  return (
    <Suspense>
      <CategoriesPageInner />
    </Suspense>
  );
}
