"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
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
  SheetBody,
} from "@/components/ui/sheet";
import { useUpdateCategory } from "@/hooks/api/inventory";
import type { InventoryCategory } from "@/types/inventory";
import { getErrorMessage } from "@/lib/get-error-message";

const NO_PARENT = "none";

const CATEGORY_NAME_MIN = 2;
const CATEGORY_NAME_MAX = 100;
const CATEGORY_DESC_MAX = 500;
const VALID_NAME_RE = /[a-zA-Z0-9]/;

const editCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required.")
    .max(CATEGORY_NAME_MAX, `Name must be ${CATEGORY_NAME_MAX} characters or fewer.`)
    .refine((v) => v.trim().length >= CATEGORY_NAME_MIN, `Name must be at least ${CATEGORY_NAME_MIN} characters.`)
    .refine((v) => VALID_NAME_RE.test(v.trim()), "Name must contain at least one letter or number."),
  parentId: z.string().optional(),
  description: z
    .string()
    .max(CATEGORY_DESC_MAX, `Description must be ${CATEGORY_DESC_MAX} characters or fewer.`)
    .optional(),
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
          name: values.name.trim(),
          parentCategoryId:
            values.parentId === NO_PARENT ? null : Number(values.parentId),
          description: values.description?.trim() || null,
        },
      });
      toast.success("Category updated");
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleCancel(): void {
    onClose();
  }

  const availableParents = categories.filter((c) => c.id !== category.id);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-md overflow-hidden">
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
            <SheetBody className="space-y-4 px-6 py-4">
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
                      <Input className="h-8" placeholder="e.g. Electronics" maxLength={CATEGORY_NAME_MAX} {...field} />
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
                    <div className="flex items-center justify-between">
                      <FormLabel>Description</FormLabel>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {(field.value ?? "").length}/{CATEGORY_DESC_MAX}
                      </span>
                    </div>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Optional description"
                        maxLength={CATEGORY_DESC_MAX}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SheetBody>
            <div className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
                <LoadingButton type="submit" isPending={updateMutation.isPending} loadingText="Saving…">
                  Save Changes
                </LoadingButton>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
