"use client";

import { type Control } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import type { ProductFormValues } from "@/features/inventory/lib/new-product-schema";

interface ProductPricingFieldsProps {
  control: Control<ProductFormValues>;
}

export function ProductPricingFields({ control }: ProductPricingFieldsProps) {
  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-foreground mb-4">Pricing</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
  );
}
