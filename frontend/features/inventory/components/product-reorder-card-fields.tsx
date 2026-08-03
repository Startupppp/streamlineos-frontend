"use client";

import { type Control } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import type { ProductFormValues } from "@/features/inventory/lib/new-product-schema";

interface ProductReorderCardFieldsProps {
  control: Control<ProductFormValues>;
  reorderEnabled: boolean;
}

export function ProductReorderCardFields({
  control,
  reorderEnabled,
}: ProductReorderCardFieldsProps) {
  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Sourcing & Reorder
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="reorderEnabled"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-md border p-3">
              <FormLabel className="cursor-pointer">
                Enable Auto-Reorder
              </FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
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
  );
}
