"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { kbCategorySchema, type KbCategoryFormValues } from "./kb-category-schema";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  useCreateSupportKbCategory,
  useUpdateSupportKbCategory,
  type KbCategory,
} from "@/hooks/api/support/kb";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

export interface KbCategoryDialogProps {
  category?: KbCategory;
  onClose: () => void;
}

export function KbCategoryDialog({ category, onClose }: KbCategoryDialogProps) {
  const isEdit = !!category;
  const create = useCreateSupportKbCategory();
  const update = useUpdateSupportKbCategory();
  const isPending = create.isPending || update.isPending;

  const form = useForm<KbCategoryFormValues>({
    resolver: zodResolver(kbCategorySchema),
    defaultValues: {
      name: category?.name ?? "",
      description: category?.description ?? "",
      icon: category?.icon ?? "",
      isPublished: category?.isPublished ?? false,
    },
  });

  function handleSave(values: KbCategoryFormValues) {
    if (isEdit) {
      update.mutate(
        {
          id: category.id,
          name: values.name,
          description: values.description?.trim() || null,
          icon: values.icon?.trim() || null,
          isPublished: values.isPublished,
        },
        {
          onSuccess: () => {
            toast.success("Category updated");
            onClose();
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    } else {
      create.mutate(
        {
          name: values.name,
          description: values.description?.trim() || undefined,
          icon: values.icon?.trim() || undefined,
          isPublished: values.isPublished,
        },
        {
          onSuccess: () => {
            toast.success("Category created");
            onClose();
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Category" : "New Category"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Getting Started" />
                  </FormControl>
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
                    <Textarea rows={2} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon name</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="Optional lucide icon name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isPublished"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div>
                    <FormLabel className="mb-0">Published to help center</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Show this category on the public help center
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <LoadingButton type="submit" isPending={isPending} loadingText="Saving…">
                {isEdit ? "Save Changes" : "Create Category"}
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
