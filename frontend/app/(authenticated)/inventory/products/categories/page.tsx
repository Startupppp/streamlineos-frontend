"use client";

import { useState } from "react";
import { Plus, Tag } from "lucide-react";
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
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { useCategories, useCreateCategory } from "@/hooks/api/inventory";
import type { InventoryCategory } from "@/types/inventory";

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
    defaultValues: {
      name: "",
      description: "",
      parentId: "",
    },
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
      const message =
        error instanceof Error ? error.message : "Failed to create category";
      toast.error(message);
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
            <Plus className="mr-1 h-4 w-4" />
            {createMutation.isPending ? "Creating…" : "Add Category"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function CategoriesPage() {
  const [formKey, setFormKey] = useState<number>(0);
  const query = useCategories();
  const categories = query.data ?? [];
  const categoryNameById = new Map(categories.map((cat) => [cat.id, cat.name]));

  function handleFormSuccess(): void {
    setFormKey((k) => k + 1);
  }

  function handleRetry(): void {
    void query.refetch();
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
        ) : categories.length === 0 ? (
          <EmptyState
            illustration={
              <Tag className="h-12 w-12 text-muted-foreground/40" />
            }
            title="No categories yet"
            description="Use the form above to add your first product category."
          />
        ) : (
          <div className="rounded-xl border border-border/60 bg-card overflow-x-auto">
            <Table className="min-w-[480px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[200px]">Parent</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="text-sm font-medium text-foreground">
                      {cat.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cat.parentCategoryId != null
                        ? (categoryNameById.get(cat.parentCategoryId) ?? "—")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {cat.description ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
