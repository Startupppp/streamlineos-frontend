"use client";

import { Control, UseFormSetValue } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { UomSelect } from "@/features/inventory/components/product-field-selects";
import type { EditFormValues } from "@/features/inventory/components/product-edit-schema";

interface ProductCostingFieldsProps {
  control: Control<EditFormValues>;
  costingMethod: string | undefined;
}

export function ProductCostingFields({ control, costingMethod }: ProductCostingFieldsProps) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Costing & Pricing
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={control}
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
              <p className="text-micro text-muted-foreground mt-1">
                Cannot change once stock exists
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
        {costingMethod === "STANDARD" && (
          <FormField
            control={control}
            name="standardCost"
            render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel>Standard Cost</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    className="tabular-nums"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={control}
          name="costPrice"
          render={({ field }) => (
            <FormItem className="min-w-0">
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
          control={control}
          name="sellingPrice"
          render={({ field }) => (
            <FormItem className="min-w-0">
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
    </div>
  );
}

interface ProductUomFieldsProps {
  control: Control<EditFormValues>;
  baseUomValue: string | undefined;
  setValue: UseFormSetValue<EditFormValues>;
}

export function ProductUomFields({ control, baseUomValue, setValue }: ProductUomFieldsProps) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Units of Measure
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <FormField
          control={control}
          name="uomId"
          render={({ field }) => (
            <FormItem className="min-w-0">
              <FormLabel>Base UOM</FormLabel>
              <UomSelect
                value={field.value ?? ""}
                onChange={(val) => {
                  field.onChange(val);
                  if (!val) {
                    setValue("purchaseUomId", "");
                    setValue("salesUomId", "");
                  }
                }}
                placeholder="Select base UOM"
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
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
          control={control}
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
    </div>
  );
}

interface ProductReorderFieldsProps {
  control: Control<EditFormValues>;
  reorderEnabled: boolean | undefined;
}

export function ProductReorderFields({ control, reorderEnabled }: ProductReorderFieldsProps) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Reorder
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="reorderEnabled"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-md border p-3">
              <FormLabel className="cursor-pointer">Enable Auto-Reorder</FormLabel>
              <FormControl>
                <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="reorderPoint"
          render={({ field }) => (
            <FormItem className="min-w-0">
              <FormLabel>Reorder Point</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="1"
                  min="0"
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
    </div>
  );
}

