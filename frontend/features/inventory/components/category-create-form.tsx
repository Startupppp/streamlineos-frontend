"use client";

import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import { LoadingButton } from "@/components/ui/loading-button";
import { useCreateCategory } from "@/hooks/api/inventory";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  categorySchema,
  type CategoryFormValues,
  CATEGORY_NAME_MAX,
  CATEGORY_DESC_MAX,
} from "@/features/inventory/lib/category-schema";
import type { InventoryCategory } from "@/types/inventory";

const NO_PARENT = "none";

interface CategoryCreateFormProps {
  categories: InventoryCategory[];
  onSuccess: () => void;
}

export function CategoryCreateForm({
  categories,
  onSuccess,
}: CategoryCreateFormProps) {
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
                  <span className="text-micro text-muted-foreground tabular-nums">
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
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
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
                    <span className="text-micro text-muted-foreground tabular-nums">
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
