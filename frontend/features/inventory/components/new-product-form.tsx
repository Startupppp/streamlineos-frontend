"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { isApiError } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  CategorySelect,
  UomSelect,
} from "@/features/inventory/components/product-field-selects";

export const SKU_PATTERN = /^[A-Z0-9][A-Z0-9_-]*$/;
export const DECIMAL_PATTERN = /^\d+(\.\d{1,4})?$/;
export const CONTAINS_ALPHANUMERIC = /[A-Za-z0-9]/;

export const NAME_MAX = 100;
export const SKU_MIN = 2;
export const SKU_MAX = 50;
export const DESCRIPTION_MAX = 2000;

export const productNameSchema = z
  .string()
  .transform((v) => v.trim())
  .pipe(
    z
      .string()
      .min(1, "Product name is required.")
      .max(NAME_MAX, `Name must be ${NAME_MAX} characters or fewer`)
      .refine((v) => CONTAINS_ALPHANUMERIC.test(v), "Name must contain at least one letter or number."),
  );

export const productSkuSchema = z
  .string()
  .transform((v) => v.trim().toUpperCase())
  .pipe(
    z
      .string()
      .min(SKU_MIN, `SKU must be at least ${SKU_MIN} characters`)
      .max(SKU_MAX, `SKU must be ${SKU_MAX} characters or fewer`)
      .regex(SKU_PATTERN, "SKU may only contain uppercase letters, digits, hyphens, or underscores"),
  );

export const productDescriptionSchema = z
  .string()
  .transform((v) => v.trim())
  .pipe(z.string().max(DESCRIPTION_MAX, `Description must be ${DESCRIPTION_MAX} characters or fewer`))
  .optional();

export const productSchema = z.object({
  name: productNameSchema,
  sku: productSkuSchema,
  description: productDescriptionSchema,
  categoryId: z.string().optional(),
  isActive: z.string().optional(),
  productType: z.enum(["STOCKABLE", "CONSUMABLE", "SERVICE"]),
  trackingMethod: z.enum(["NONE", "LOT", "SERIAL"]),
  costingMethod: z.enum(["STANDARD", "WEIGHTED_AVERAGE", "FIFO"]),
  standardCost: z
    .string()
    .optional()
    .refine(
      (v) => !v || DECIMAL_PATTERN.test(v),
      "Enter a number with up to 4 decimal places",
    ),
  costPrice: z
    .string()
    .optional()
    .refine(
      (v) => !v || (Number.isFinite(Number(v)) && Number(v) >= 0),
      "Must be a non-negative number",
    ),
  sellingPrice: z
    .string()
    .optional()
    .refine(
      (v) => !v || (Number.isFinite(Number(v)) && Number(v) >= 0),
      "Must be a non-negative number",
    ),
  uomId: z.string().optional(),
  purchaseUomId: z.string().optional(),
  salesUomId: z.string().optional(),
  barcode: z.string().max(100, "Barcode must be 100 characters or fewer").optional(),
  reorderEnabled: z.boolean(),
  reorderPoint: z
    .string()
    .optional()
    .refine(
      (v) => !v || (Number.isFinite(Number(v)) && Number(v) >= 0),
      "Must be a non-negative number",
    ),
});

export type ProductFormValues = z.infer<typeof productSchema>;

interface NewProductFormProps {
  onSubmit: (values: ProductFormValues) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
}

export function NewProductForm({ onSubmit, onCancel, isPending }: NewProductFormProps) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      categoryId: "",
      isActive: "true",
      productType: "STOCKABLE",
      trackingMethod: "NONE",
      costingMethod: "STANDARD",
      standardCost: "",
      costPrice: "",
      sellingPrice: "",
      uomId: "",
      purchaseUomId: "",
      salesUomId: "",
      barcode: "",
      reorderEnabled: false,
      reorderPoint: "",
    },
  });

  const costingMethod = form.watch("costingMethod");
  const reorderEnabled = form.watch("reorderEnabled");
  const baseUomValue = form.watch("uomId");
  const nameValue = useWatch({ control: form.control, name: "name" });
  const descriptionValue = useWatch({ control: form.control, name: "description" });

  async function handleSubmit(values: ProductFormValues): Promise<void> {
    try {
      await onSubmit(values);
    } catch (error) {
      if (isApiError(error)) {
        const msg = error.message.toLowerCase();
        if (error.status === 409 && msg.includes("sku")) {
          form.setError("sku", { message: "A product with this SKU already exists." });
          form.setFocus("sku");
          return;
        }
        if (error.status === 400 && msg.includes("name")) {
          form.setError("name", { message: "Product name is required." });
          form.setFocus("name");
          return;
        }
      }
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pb-24">
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Product name" maxLength={NAME_MAX} {...field} />
                  </FormControl>
                  <div className="flex justify-between items-start">
                    <FormMessage />
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                      {(nameValue ?? "").length}/{NAME_MAX}
                    </span>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="PROD-001"
                      className="font-mono"
                      maxLength={SKU_MAX}
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="barcode"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Barcode</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="EAN / UPC / QR"
                      className="font-mono"
                      maxLength={100}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Category</FormLabel>
                  <CategorySelect value={field.value ?? ""} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
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
                        placeholder="Optional product description"
                        rows={3}
                        maxLength={DESCRIPTION_MAX}
                        {...field}
                      />
                    </FormControl>
                    <div className="flex justify-between items-start">
                      <FormMessage />
                      <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                        {(descriptionValue ?? "").length}/{DESCRIPTION_MAX}
                      </span>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Classification</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="productType"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Product Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="STOCKABLE">Stockable</SelectItem>
                      <SelectItem value="CONSUMABLE">Consumable</SelectItem>
                      <SelectItem value="SERVICE">Service</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="trackingMethod"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Tracking Method</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      <SelectItem value="LOT">Lot / Batch</SelectItem>
                      <SelectItem value="SERIAL">Serial</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Cannot change once stock exists
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Costing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="costingMethod"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Costing Method</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="STANDARD">Standard</SelectItem>
                      <SelectItem value="WEIGHTED_AVERAGE">Weighted Average</SelectItem>
                      <SelectItem value="FIFO">FIFO</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Cannot change once stock exists
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            {costingMethod === "STANDARD" && (
              <FormField
                control={form.control}
                name="standardCost"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>Standard Cost</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.0001"
                        min="0"
                        placeholder="0.00"
                        className="tabular-nums"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Pricing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="costPrice"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Cost Price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
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
                <FormItem className="min-w-0">
                  <FormLabel>Selling Price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="tabular-nums"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Units of Measure</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="uomId"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Base UOM</FormLabel>
                  <UomSelect
                    value={field.value ?? ""}
                    onChange={(val) => {
                      field.onChange(val);
                      if (!val) {
                        form.setValue("purchaseUomId", "");
                        form.setValue("salesUomId", "");
                      }
                    }}
                    placeholder="Select base UOM"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="purchaseUomId"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Purchase UOM</FormLabel>
                  <UomSelect
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Same as base"
                    disabled={!baseUomValue}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="salesUomId"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Sales UOM</FormLabel>
                  <UomSelect
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Same as base"
                    disabled={!baseUomValue}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Sourcing & Reorder</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="reorderEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <FormLabel className="cursor-pointer">Enable Auto-Reorder</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reorderPoint"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Reorder Point</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="Min qty before reorder"
                      className="tabular-nums"
                      disabled={!reorderEnabled}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <LoadingButton type="submit" isPending={isPending} loadingText="Creating…">
            Create Product
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}
