import type { UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEPRECIATION_METHOD_OPTIONS,
  isDepreciationMethod,
} from "@/features/accounting/assets/asset-constants";
import type { AssetCategory, DepreciationMethod } from "@/types/accounting/assets";
import { numericFieldValue } from "@/lib/numeric-field";

const createAssetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.number().min(1, "Category is required"),
  acquisitionDate: z.string().min(1, "Date is required"),
  acquisitionCost: z.string().min(1, "Cost is required"),
  salvageValue: z.string(),
  usefulLifeMonths: z.number().min(1, "Useful life is required"),
  depreciationMethod: z.enum([
    "STRAIGHT_LINE",
    "DECLINING_BALANCE",
    "UNITS_OF_PRODUCTION",
  ]),
  vendorId: z.number().optional(),
  billId: z.number().optional(),
});

export type CreateAssetFormValues = z.infer<typeof createAssetSchema>;

interface CreateAssetSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: AssetCategory[];
  isSubmitting: boolean;
  onSubmit: (values: CreateAssetFormValues) => void;
}

/**
 * The select's option values are stringified ids. `Number("")` is `0`, which is
 * a valid-looking category id, so an unparseable value has to become the
 * schema's own "not chosen" sentinel rather than a silent zero.
 */
function makeCategoryChange(
  form: UseFormReturn<CreateAssetFormValues>,
): (value: string) => void {
  return function handleCategoryChange(value) {
    form.setValue("categoryId", numericFieldValue(value) ?? 0, { shouldValidate: true });
  };
}

function makeDepreciationMethodChange(
  form: UseFormReturn<CreateAssetFormValues>,
): (value: DepreciationMethod) => void {
  return function handleDepreciationMethodChange(value) {
    form.setValue("depreciationMethod", value, { shouldValidate: true });
  };
}

export function CreateAssetSheet({
  open,
  onOpenChange,
  categories,
  isSubmitting,
  onSubmit,
}: CreateAssetSheetProps) {
  return (
    <EntityFormSheet<CreateAssetFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Add Fixed Asset"
      description="Record a new fixed asset for depreciation tracking."
      resolver={zodResolver(createAssetSchema)}
      defaultValues={{
        name: "",
        categoryId: 0,
        acquisitionDate: "",
        acquisitionCost: "",
        salvageValue: "0",
        usefulLifeMonths: 60,
        depreciationMethod: "STRAIGHT_LINE",
      }}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Create Asset"
      resetOnOpen
    >
      {(form) => (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="asset-name">Name</Label>
            <Input
              id="asset-name"
              {...form.register("name")}
              placeholder="e.g. Office Laptop"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={String(form.watch("categoryId") || "")}
              onValueChange={makeCategoryChange(form)}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.categoryId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.categoryId.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="asset-date">Acquisition Date</Label>
            <Input
              id="asset-date"
              type="date"
              {...form.register("acquisitionDate")}
            />
            {form.formState.errors.acquisitionDate && (
              <p className="text-xs text-destructive">
                {form.formState.errors.acquisitionDate.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="asset-cost">Acquisition Cost</Label>
              <Input
                id="asset-cost"
                type="number"
                min={0}
                step="0.01"
                {...form.register("acquisitionCost")}
                placeholder="0.00"
              />
              {form.formState.errors.acquisitionCost && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.acquisitionCost.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="asset-salvage">Salvage Value</Label>
              <Input
                id="asset-salvage"
                type="number"
                min={0}
                step="0.01"
                {...form.register("salvageValue")}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="asset-life">Useful Life (months)</Label>
              <Input
                id="asset-life"
                type="number"
                min={1}
                {...form.register("usefulLifeMonths", { valueAsNumber: true })}
                placeholder="60"
              />
              {form.formState.errors.usefulLifeMonths && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.usefulLifeMonths.message}
                </p>
              )}
            </div>
            <DepreciationMethodField
              value={form.watch("depreciationMethod")}
              onValueChange={makeDepreciationMethodChange(form)}
            />
          </div>
        </>
      )}
    </EntityFormSheet>
  );
}

interface DepreciationMethodFieldProps {
  value: DepreciationMethod;
  onValueChange: (value: DepreciationMethod) => void;
}

function DepreciationMethodField({
  value,
  onValueChange,
}: DepreciationMethodFieldProps) {
  function handleValueChange(nextValue: string): void {
    if (isDepreciationMethod(nextValue)) onValueChange(nextValue);
  }

  return (
    <div className="space-y-1.5">
      <Label>Depreciation Method</Label>
      <Select value={value} onValueChange={handleValueChange}>
        <SelectTrigger className="text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DEPRECIATION_METHOD_OPTIONS.map((method) => (
            <SelectItem key={method.value} value={method.value}>
              {method.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
