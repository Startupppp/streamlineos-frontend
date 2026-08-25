"use client";

import { type Control } from "react-hook-form";
import { Input } from "@/components/ui/input";
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

interface ProductCostingCardFieldsProps {
  control: Control<ProductFormValues>;
  costingMethod: string;
}

export function ProductCostingCardFields({
  control,
  costingMethod,
}: ProductCostingCardFieldsProps) {
  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-foreground mb-4">Costing</h2>
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
                  <SelectItem value="WEIGHTED_AVERAGE">
                    Weighted Average
                  </SelectItem>
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
  );
}
