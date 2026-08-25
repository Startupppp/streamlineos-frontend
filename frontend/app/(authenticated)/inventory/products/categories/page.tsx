"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
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
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useCan } from "@/hooks/api/access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
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
import { CategoryCreateForm } from "@/features/inventory/components/category-create-form";
import { CategoryEditSheet } from "@/features/inventory/components/category-edit-sheet";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import {
  useCategories,
  useUpdateCategory,
} from "@/hooks/api/inventory";
import type { InventoryCategory } from "@/types/inventory";

function categoriesColumns(
  categoryNameById: Map<number, string>,
  onEdit: (cat: InventoryCategory) => void,
  onArchiveToggle: (cat: InventoryCategory) => void,
  canUpdate: boolean,
): DataTableColumn<InventoryCategory>[] {
  const columns: DataTableColumn<InventoryCategory>[] = [
    {
      key: "name",
      header: "Name",
      cell: (cat) => (
        <div className="flex items-center gap-2 font-medium text-foreground">
          {cat.name}
          {!cat.isActive && (
            <Badge
              variant="outline"
              className="h-4 text-micro px-1.5 py-0 border-border text-muted-foreground bg-muted"
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
  ];

  if (canUpdate) {
    columns.push({
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
    });
  }

  return columns;
}

function CategoriesPageInner() {
  const canCreate = useCan("inventory:products:create");
  const canUpdate = useCan("inventory:products:update");
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

  const updateParams = useCallback((updates: Record<string, string | null>): void => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  function handleSearchChange(value: string): void {
    setSearchInput(value);
  }

  useEffect(() => {
    const trimmed = debouncedSearch.trim() || null;
    const current = searchParams.get("search") ?? null;
    if (trimmed !== current) {
      updateParams({ search: trimmed });
    }
  }, [debouncedSearch, updateParams, searchParams]);

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
      <SearchInput
        value={searchInput}
        onValueChange={handleSearchChange}
        placeholder="Search categories..."
      />
      <div className="hidden min-w-0 items-center gap-2 sm:flex">
        <Select value={statusParam} onValueChange={handleStatusChange}>
          <SelectTrigger
            className={cn(FILTER_SELECT_TRIGGER, "w-[140px] text-xs")}
          >
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
      subtitle="Organise products into categories and sub-categories."
      filters={filtersRow}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {canCreate && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Add Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryCreateForm
                key={formKey}
                categories={categories}
                onSuccess={handleFormSuccess}
              />
            </CardContent>
          </Card>
        )}

        {query.error ? (
          <ErrorState
            title="Failed to load categories"
            description={getErrorMessage(query.error)}
            onRetry={handleRetry}
          />
        ) : (
          <DataTable
            data={filteredCategories}
            className="flex-1 min-h-0"
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
                title={hasFilters ? "No categories found" : "No categories yet"}
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
              canUpdate,
            )}
            minWidth="560px"
          />
        )}
      </div>

      {canUpdate && editingCategory !== null && (
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
