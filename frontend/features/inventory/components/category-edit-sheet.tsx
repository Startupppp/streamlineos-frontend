"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useUpdateCategory } from "@/hooks/api/inventory";
import type { InventoryCategory } from "@/types/inventory";

const NO_PARENT = "none";

const editCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  parentId: z.string().optional(),
  description: z.string().max(500).optional(),
});

type EditCategoryFormValues = z.infer<typeof editCategorySchema>;

interface CategoryEditSheetProps {
  category: InventoryCategory;
  categories: InventoryCategory[];
  open: boolean;
  onClose: () => void;
}

export function CategoryEditSheet({
  category,
  categories,
  open,
  onClose,
}: CategoryEditSheetProps) {
  const updateMutation = useUpdateCategory();

  const form = useForm<EditCategoryFormValues>({
    resolver: zodResolver(editCategorySchema),
    defaultValues: {
      name: category.name,
      parentId:
        category.parentCategoryId != null
          ? String(category.parentCategoryId)
          : NO_PARENT,
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
          parentCategoryId:
            values.parentId === NO_PARENT ? null : Number(values.parentId),
          description: values.description || null,
        },
      });
      toast.success("Category updated");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update category",
      );
    }
  }

  function handleCancel(): void {
    onClose();
  }

  const availableParents = categories.filter((c) => c.id !== category.id);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-md">
        <SheetHeader className="shrink-0 px-6 py-4 border-b">
          <SheetTitle>Edit Category</SheetTitle>
          <SheetDescription>
            Update the category name, parent, or description.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
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
                        <SelectItem value={NO_PARENT}>
                          None (top-level)
                        </SelectItem>
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
                      <Textarea
                        rows={3}
                        placeholder="Optional description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="shrink-0 px-6 py-4 border-t">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
