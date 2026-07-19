"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useCategories, useCreateCategory, useCreateUom, useUom } from "@/hooks/api/inventory";
import { getErrorMessage } from "@/lib/get-error-message";

const CREATE_SENTINEL = "__create__";

const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
});
type CategoryCreateValues = z.infer<typeof categoryCreateSchema>;

const uomCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  abbreviation: z.string().trim().min(1, "Abbreviation is required").max(20),
});
type UomCreateValues = z.infer<typeof uomCreateSchema>;

export interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function CategorySelect({ value, onChange }: CategorySelectProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const categoriesQuery = useCategories();
  const createMutation = useCreateCategory();
  const categories = categoriesQuery.data ?? [];

  const form = useForm<CategoryCreateValues>({
    resolver: zodResolver(categoryCreateSchema),
    defaultValues: { name: "" },
  });

  function handleValueChange(val: string): void {
    if (val === CREATE_SENTINEL) {
      setDialogOpen(true);
    } else {
      onChange(val);
    }
  }

  async function onSubmit(values: CategoryCreateValues): Promise<void> {
    try {
      const created = await createMutation.mutateAsync({ name: values.name });
      onChange(String(created.id));
      setDialogOpen(false);
      form.reset();
      toast.success("Category created");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleDialogOpenChange(open: boolean): void {
    if (!open) form.reset();
    setDialogOpen(open);
  }

  function handleCancelCategory(): void {
    setDialogOpen(false);
  }

  return (
    <>
      <Select value={value} onValueChange={handleValueChange} disabled={categoriesQuery.isLoading}>
        <SelectTrigger className="min-w-0">
          <SelectValue placeholder={categoriesQuery.isLoading ? "Loading…" : "Select category"} />
        </SelectTrigger>
        <SelectContent>
          {categories.length === 0 && !categoriesQuery.isLoading && (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              No categories yet
            </div>
          )}
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={String(cat.id)}>
              <span className="truncate">{cat.name}</span>
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={CREATE_SENTINEL}>
            <span className="flex items-center gap-1.5 text-accent font-medium">
              <Plus className="h-3 w-3 shrink-0" />
              New category…
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Category</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Electronics" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelCategory}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
                <LoadingButton type="submit" isPending={createMutation.isPending} loadingText="Creating…">
                  Create
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export interface UomSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function UomSelect({
  value,
  onChange,
  placeholder = "Select UOM",
  disabled = false,
}: UomSelectProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const uomQuery = useUom();
  const createMutation = useCreateUom();
  const uomOptions = uomQuery.data ?? [];

  const form = useForm<UomCreateValues>({
    resolver: zodResolver(uomCreateSchema),
    defaultValues: { name: "", abbreviation: "" },
  });

  function handleValueChange(val: string): void {
    if (val === CREATE_SENTINEL) {
      setDialogOpen(true);
    } else {
      onChange(val);
    }
  }

  async function onSubmit(values: UomCreateValues): Promise<void> {
    try {
      const created = await createMutation.mutateAsync(values);
      onChange(String(created.id));
      setDialogOpen(false);
      form.reset();
      toast.success("Unit of measure created");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleDialogOpenChange(open: boolean): void {
    if (!open) form.reset();
    setDialogOpen(open);
  }

  function handleCancelUom(): void {
    setDialogOpen(false);
  }

  const isLoading = uomQuery.isLoading;

  return (
    <>
      <Select
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className="min-w-0">
          <SelectValue placeholder={isLoading ? "Loading…" : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {uomOptions.length === 0 && !isLoading && (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              No units yet
            </div>
          )}
          {uomOptions.map((uom) => (
            <SelectItem key={uom.id} value={String(uom.id)}>
              {uom.name} ({uom.abbreviation})
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={CREATE_SENTINEL}>
            <span className="flex items-center gap-1.5 text-accent font-medium">
              <Plus className="h-3 w-3 shrink-0" />
              New unit…
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Unit of Measure</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Kilogram" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="abbreviation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Abbreviation</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. kg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelUom}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
                <LoadingButton type="submit" isPending={createMutation.isPending} loadingText="Creating…">
                  Create
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
