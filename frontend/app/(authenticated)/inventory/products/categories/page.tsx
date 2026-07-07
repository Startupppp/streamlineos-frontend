"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, MoreHorizontal, Pencil, Archive, RotateCcw, Search } from "lucide-react";
import { EmptyProductsIllustration, EmptySearchIllustration } from "@/components/illustrations";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState } from "@/components/shared";
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

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
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
    try {
      await createMutation.mutateAsync({
        name: values.name,
        description: values.description || undefined,
        parentCategoryId:
          values.parentId === NO_PARENT ? undefined : Number(values.parentId),
      });
      toast.success(`Category "${values.name}" created`);
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
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Electronics" {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="Optional description"
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
          <Button type="submit" size="sm" disabled={createMutation.isPending}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            {createMutation.isPending ? "Creating…" : "Add Category"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

interface CategoryRowProps {
  cat: InventoryCategory;
  categoryNameById: Map<number, string>;
  onEdit: (cat: InventoryCategory) => void;
  onArchiveToggle: (cat: InventoryCategory) => void;
}

function CategoryRow({
  cat,
  categoryNameById,
  onEdit,
  onArchiveToggle,
}: CategoryRowProps) {
  function handleEdit(): void {
    onEdit(cat);
  }

  function handleArchiveToggle(): void {
    onArchiveToggle(cat);
  }

  return (
    <TableRow className={`h-8 hover:bg-muted/30 transition-colors${!cat.isActive ? " opacity-60" : ""}`}>
      <TableCell className="px-2 py-1 text-[11px] font-medium text-foreground">
        <div className="flex items-center gap-2">
          {cat.name}
          {!cat.isActive && (
            <Badge
              variant="outline"
              className="h-4 text-[9px] px-1.5 py-0 border-slate-200 text-slate-600 bg-slate-100"
            >
              Archived
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="px-2 py-1 text-[11px] text-muted-foreground">
        {cat.parentCategoryId != null
          ? (categoryNameById.get(cat.parentCategoryId) ?? "—")
          : "—"}
      </TableCell>
      <TableCell className="px-2 py-1 text-[11px] text-muted-foreground max-w-xs truncate">
        {cat.description ?? "—"}
      </TableCell>
      <TableCell className="px-2 py-1 w-8">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={`Actions for ${cat.name}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleArchiveToggle}
              className={
                cat.isActive
                  ? "text-destructive focus:text-destructive"
                  : undefined
              }
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
      </TableCell>
    </TableRow>
  );
}

function CategoriesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formKey, setFormKey] = useState<number>(0);
  const [editingCategory, setEditingCategory] =
    useState<InventoryCategory | null>(null);

  const search = searchParams.get("search") ?? "";
  const statusParam = searchParams.get("status") ?? "all";

  const query = useCategories();
  const updateMutation = useUpdateCategory();
  const categories = query.data ?? [];

  const filteredCategories = categories.filter((cat) => {
    const matchesSearch =
      !search || cat.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusParam === "all" ||
      (statusParam === "active" && cat.isActive) ||
      (statusParam === "archived" && !cat.isActive);
    return matchesSearch && matchesStatus;
  });

  const categoryNameById = new Map(
    categories.map((cat) => [cat.id, cat.name]),
  );

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

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>): void {
    updateParams({ search: e.target.value || null });
  }

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

  const hasFilters = !!(search || (statusParam && statusParam !== "all"));

  const filtersRow = (
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
      <div className="relative min-w-0 flex-1 lg:max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={handleSearchChange}
          placeholder="Search categories..."
          className="h-8 w-full min-w-0 pl-8 text-xs"
        />
      </div>
      <div className="hidden min-w-0 items-center gap-2 sm:flex">
        <Select value={statusParam} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
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
      eyebrow="Inventory · Products"
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

        {query.isLoading ? (
          <LoadingState variant="table" rows={5} />
        ) : query.error ? (
          <ErrorState
            title="Failed to load categories"
            description={query.error.message}
            onRetry={handleRetry}
          />
        ) : filteredCategories.length === 0 ? (
          <InventoryEmptyState
            illustration={
              hasFilters ? <EmptySearchIllustration /> : <EmptyProductsIllustration />
            }
            title={hasFilters ? "No categories found" : "No categories yet"}
            description={
              hasFilters
                ? "Try adjusting your search or filters."
                : "Use the form above to add your first product category."
            }
            className="border-0 bg-transparent min-h-[20vh]"
          />
        ) : (
          <div className="rounded-md border border-border overflow-x-auto">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 bg-muted/80">
                    Name
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 bg-muted/80 w-[180px]">
                    Parent
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 bg-muted/80">
                    Description
                  </TableHead>
                  <TableHead className="bg-muted/80 w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((cat) => (
                  <CategoryRow
                    key={cat.id}
                    cat={cat}
                    categoryNameById={categoryNameById}
                    onEdit={handleEditOpen}
                    onArchiveToggle={handleArchiveToggle}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
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
