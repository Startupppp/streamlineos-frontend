"use client";

import { useState } from "react";
import { Plus, Tag, MoreHorizontal, Pencil, Archive, RotateCcw } from "lucide-react";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
} from "@/hooks/api/inventory";
import type { InventoryCategory } from "@/types/inventory";

const NO_PARENT = "none";

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  parentId: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const editCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  parentId: z.string().optional(),
  description: z.string().max(500).optional(),
});

type EditCategoryFormValues = z.infer<typeof editCategorySchema>;

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
    defaultValues: { name: "", description: "", parentId: "" },
  });

  async function onSubmit(values: CategoryFormValues): Promise<void> {
    try {
      await createMutation.mutateAsync({
        name: values.name,
        description: values.description || undefined,
        parentCategoryId: values.parentId ? Number(values.parentId) : undefined,
      });
      toast.success(`Category "${values.name}" created`);
      form.reset();
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create category");
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
                    <SelectItem value="">None (top-level)</SelectItem>
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
                    <Textarea rows={2} placeholder="Optional description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={createMutation.isPending}>
            <Plus className="mr-1 h-4 w-4" />
            {createMutation.isPending ? "Creating…" : "Add Category"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function EditCategorySheet({
  category,
  categories,
  open,
  onClose,
}: {
  category: InventoryCategory;
  categories: InventoryCategory[];
  open: boolean;
  onClose: () => void;
}) {
  const updateMutation = useUpdateCategory();

  const form = useForm<EditCategoryFormValues>({
    resolver: zodResolver(editCategorySchema),
    defaultValues: {
      name: category.name,
      parentId: category.parentCategoryId != null ? String(category.parentCategoryId) : "",
      description: category.description ?? "",
    },
  });

  function handleOpenChange(isOpen: boolean): void {
    if (!isOpen) onClose();
  }

  async function onSubmit(values: EditCategoryFormValues): Promise<void> {
    try {
      await updateMutation.mutateAsync({
        categoryId: category.id,
        data: {
          name: values.name,
          parentCategoryId: values.parentId ? Number(values.parentId) : null,
          description: values.description || null,
        },
      });
      toast.success("Category updated");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update category");
    }
  }

  function handleCancel(): void {
    onClose();
  }

  const availableParents = categories.filter((c) => c.id !== category.id);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-6">
        <SheetHeader>
          <SheetTitle>Edit Category</SheetTitle>
          <SheetDescription>Update the category name, parent, or description.</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-6">
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
                      <SelectItem value="">None (top-level)</SelectItem>
                      {availableParents.map((cat) => (
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
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Optional description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

function CategoryRow({
  cat,
  categoryNameById,
  onEdit,
  onArchiveToggle,
}: {
  cat: InventoryCategory;
  categoryNameById: Map<number, string>;
  onEdit: (cat: InventoryCategory) => void;
  onArchiveToggle: (cat: InventoryCategory) => void;
}) {
  function handleEdit(): void {
    onEdit(cat);
  }

  function handleArchiveToggle(): void {
    onArchiveToggle(cat);
  }

  return (
    <TableRow className={!cat.isActive ? "opacity-60" : undefined}>
      <TableCell className="text-sm font-medium text-foreground">
        <div className="flex items-center gap-2">
          {cat.name}
          {!cat.isActive && (
            <Badge variant="secondary" className="text-xs">
              Archived
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {cat.parentCategoryId != null
          ? (categoryNameById.get(cat.parentCategoryId) ?? "—")
          : "—"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
        {cat.description ?? "—"}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
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
              className={cat.isActive ? "text-destructive focus:text-destructive" : undefined}
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

export default function CategoriesPage() {
  const [formKey, setFormKey] = useState<number>(0);
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  const query = useCategories();
  const updateMutation = useUpdateCategory();
  const categories = query.data ?? [];
  const categoryNameById = new Map(categories.map((cat) => [cat.id, cat.name]));

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
      toast.error(error instanceof Error ? error.message : "Action failed");
    }
  }

  return (
    <PageWrapper
      eyebrow="Inventory · Products"
      title="Categories"
      subtitle="Organise products into categories and sub-categories."
      badge={categories.length > 0 ? `${categories.length}` : undefined}
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Add Category</CardTitle>
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
        ) : categories.length === 0 ? (
          <EmptyState
            illustration={<Tag className="h-12 w-12 text-muted-foreground/40" />}
            title="No categories yet"
            description="Use the form above to add your first product category."
          />
        ) : (
          <div className="rounded-xl border border-border/60 bg-card overflow-x-auto">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[180px]">Parent</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
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
        <EditCategorySheet
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
