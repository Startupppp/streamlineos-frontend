"use client";

import type { UseFormReturn } from "react-hook-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  useCreateProductVariant,
  useUpdateProductVariant,
} from "@/hooks/api/inventory";
import { getErrorMessage } from "@/lib/get-error-message";

const variantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional(),
  costPrice: z.string().optional(),
  sellingPrice: z.string().min(1, "Selling price is required"),
  isActive: z.boolean(),
});

type VariantFormValues = z.infer<typeof variantSchema>;

export interface ProductVariantForSheet {
  id: number;
  name: string;
  sku: string;
  barcode?: string | null;
  costPrice?: string | number | null;
  sellingPrice?: string | number | null;
  isActive: boolean;
}

interface VariantFormBodyProps {
  form: UseFormReturn<VariantFormValues>;
  isPending: boolean;
  onCancel: () => void;
}

function VariantFormBody({ form, isPending, onCancel }: VariantFormBodyProps) {
  return (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Large / Red" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sku"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SKU</FormLabel>
              <FormControl>
                <Input className="font-mono" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="barcode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Barcode</FormLabel>
              <FormControl>
                <Input className="font-mono" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="costPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="tabular-nums"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sellingPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Selling Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="tabular-nums"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <FormLabel className="mb-0 cursor-pointer">Active</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      <div className="shrink-0 px-6 py-4 border-t">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </>
  );
}

interface AddVariantSheetProps {
  productId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddVariantSheet({ productId, open, onOpenChange }: AddVariantSheetProps) {
  const createMutation = useCreateProductVariant(productId);

  const form = useForm<VariantFormValues>({
    resolver: zodResolver(variantSchema),
    defaultValues: {
      name: "",
      sku: "",
      barcode: "",
      costPrice: "",
      sellingPrice: "",
      isActive: true,
    },
  });

  async function onSubmit(values: VariantFormValues): Promise<void> {
    try {
      await createMutation.mutateAsync({
        name: values.name,
        sku: values.sku,
        barcode: values.barcode || undefined,
        costPrice: values.costPrice ? Number(values.costPrice) : undefined,
        sellingPrice: Number(values.sellingPrice),
      });
      toast.success("Variant created");
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleOpenChange(next: boolean): void {
    if (!next) form.reset();
    onOpenChange(next);
  }

  function handleCancel(): void {
    handleOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-md overflow-hidden">
        <SheetHeader className="shrink-0 px-6 py-4 border-b">
          <SheetTitle>Add Variant</SheetTitle>
          <SheetDescription>Add a new variant to this product.</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <VariantFormBody
              form={form}
              isPending={createMutation.isPending}
              onCancel={handleCancel}
            />
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

interface EditVariantSheetProps {
  productId: number;
  variant: ProductVariantForSheet | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditVariantSheet({
  productId,
  variant,
  open,
  onOpenChange,
}: EditVariantSheetProps) {
  const updateMutation = useUpdateProductVariant(productId);

  const form = useForm<VariantFormValues>({
    resolver: zodResolver(variantSchema),
    defaultValues: {
      name: variant?.name ?? "",
      sku: variant?.sku ?? "",
      barcode: variant?.barcode ?? "",
      costPrice: variant?.costPrice != null ? String(variant.costPrice) : "",
      sellingPrice: variant?.sellingPrice != null ? String(variant.sellingPrice) : "",
      isActive: variant?.isActive ?? true,
    },
  });

  async function onSubmit(values: VariantFormValues): Promise<void> {
    if (!variant) return;
    try {
      await updateMutation.mutateAsync({
        variantId: variant.id,
        data: {
          name: values.name,
          sku: values.sku,
          barcode: values.barcode || undefined,
          costPrice: values.costPrice || undefined,
          sellingPrice: values.sellingPrice,
          isActive: values.isActive,
        },
      });
      toast.success("Variant updated");
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleOpenChange(next: boolean): void {
    onOpenChange(next);
  }

  function handleCancel(): void {
    handleOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-md overflow-hidden">
        <SheetHeader className="shrink-0 px-6 py-4 border-b">
          <SheetTitle>Edit Variant</SheetTitle>
          <SheetDescription>Update the details of this variant.</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <VariantFormBody
              form={form}
              isPending={updateMutation.isPending}
              onCancel={handleCancel}
            />
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
