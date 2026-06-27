"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { EntityFormDialog } from "@/components/shared";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateKbCategory } from "@/lib/api/hooks/kb";
import { getApiError } from "@/lib/api-client";
import type { KbCategory } from "@/types/kb";

const NO_PARENT = "none";

const createCollectionSchema = z.object({
  name: z.string().min(1, "Collection name is required"),
  parentId: z.string(),
  icon: z.string(),
});

type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

interface CreateCollectionDialogProps {
  spaceId: number;
  categories: KbCategory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCollectionDialog({
  spaceId,
  categories,
  open,
  onOpenChange,
}: CreateCollectionDialogProps) {
  const createCategory = useCreateKbCategory(spaceId);

  const handleSubmit = (data: CreateCollectionInput) => {
    const trimmedIcon = data.icon.trim();
    createCategory.mutate(
      {
        name: data.name.trim(),
        parentId: data.parentId === NO_PARENT ? null : Number(data.parentId),
        icon: trimmedIcon.length > 0 ? trimmedIcon : null,
      },
      {
        onSuccess: () => {
          toast.success("Collection created");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getApiError(error)),
      },
    );
  };

  return (
    <EntityFormDialog<CreateCollectionInput>
      open={open}
      onOpenChange={onOpenChange}
      title="New collection"
      description="Group related articles into a collection."
      resolver={zodResolver(createCollectionSchema)}
      defaultValues={{ name: "", parentId: NO_PARENT, icon: "" }}
      onSubmit={handleSubmit}
      isSubmitting={createCategory.isPending}
      submitLabel="Create collection"
      resetOnOpen
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Getting started" {...field} />
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
                <FormLabel>Parent collection</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_PARENT}>None</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
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
            name="icon"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Icon</FormLabel>
                <FormControl>
                  <Input placeholder="Optional lucide icon name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormDialog>
  );
}
