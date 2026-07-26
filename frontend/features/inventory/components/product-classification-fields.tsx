"use client";

import { type Control } from "react-hook-form";
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
import { Card } from "@/components/ui/card";
import type { ProductFormValues } from "@/features/inventory/lib/new-product-schema";

interface ProductClassificationFieldsProps {
  control: Control<ProductFormValues>;
}

export function ProductClassificationFields({
  control,
}: ProductClassificationFieldsProps) {
  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Classification
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={control}
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
          control={control}
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
  );
}
