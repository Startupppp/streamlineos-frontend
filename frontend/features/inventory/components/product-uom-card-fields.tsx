"use client";

import { type Control, type UseFormSetValue } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { UomSelect } from "@/features/inventory/components/uom-select";
import type { ProductFormValues } from "@/features/inventory/lib/new-product-schema";

interface ProductUomCardFieldsProps {
  control: Control<ProductFormValues>;
  baseUomValue: string | undefined;
  setValue: UseFormSetValue<ProductFormValues>;
}

export function ProductUomCardFields({
  control,
  baseUomValue,
  setValue,
}: ProductUomCardFieldsProps) {
  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Units of Measure
      </h2>
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
    </Card>
  );
}
