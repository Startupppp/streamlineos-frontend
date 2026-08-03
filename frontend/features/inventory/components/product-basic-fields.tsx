"use client";

import { type ChangeEvent } from "react";
import { type Control, type UseFormSetFocus, type UseFormSetValue, type UseFormClearErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { CategorySelect } from "@/features/inventory/components/product-field-selects";
import { cn } from "@/lib/utils";
import {
  NAME_MAX,
  SKU_MAX,
  DESCRIPTION_MAX,
  type ProductFormValues,
} from "@/features/inventory/lib/new-product-schema";

interface ProductBasicFieldsProps {
  control: Control<ProductFormValues>;
  skuAuto: boolean;
  nameValue: string | undefined;
  descriptionValue: string | undefined;
  onCustomizeSku: () => void;
  onResetSkuAuto: () => void;
  onSkuChange: (event: ChangeEvent<HTMLInputElement>, onChange: (v: string) => void) => void;
  setValue: UseFormSetValue<ProductFormValues>;
  setFocus: UseFormSetFocus<ProductFormValues>;
  clearErrors: UseFormClearErrors<ProductFormValues>;
}

export function ProductBasicFields({
  control,
  skuAuto,
  nameValue,
  descriptionValue,
  onCustomizeSku,
  onResetSkuAuto,
  onSkuChange,
}: ProductBasicFieldsProps) {
  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Basic Information
      </h2>
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem className="min-w-0">
              <div className="flex h-5 items-center">
                <FormLabel>Name</FormLabel>
              </div>
              <FormControl>
                <Input
                  placeholder="Product name"
                  maxLength={NAME_MAX}
                  {...field}
                />
              </FormControl>
              <div className="flex min-h-5 items-start justify-between gap-2">
                <FormMessage />
                <span className="ml-auto shrink-0 text-[10px] text-muted-foreground tabular-nums">
                  {(nameValue ?? "").length}/{NAME_MAX}
                </span>
              </div>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="sku"
          render={({ field }) => {
            function onSkuInputChange(event: ChangeEvent<HTMLInputElement>): void {
              onSkuChange(event, field.onChange);
            }

            return (
              <FormItem className="min-w-0">
                <div className="flex h-5 items-center justify-between gap-2">
                  <FormLabel>SKU</FormLabel>
                  {skuAuto ? (
                    <button
                      type="button"
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                      onClick={onCustomizeSku}
                    >
                      Customize
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                      onClick={onResetSkuAuto}
                    >
                      Use auto
                    </button>
                  )}
                </div>
                <FormControl>
                  <Input
                    placeholder="PROD-001"
                    className={cn("font-mono", skuAuto && "text-muted-foreground")}
                    maxLength={SKU_MAX}
                    {...field}
                    value={skuAuto ? "" : field.value}
                    disabled={skuAuto}
                    readOnly={skuAuto}
                    onChange={onSkuInputChange}
                  />
                </FormControl>
                <div className="flex min-h-5 items-start justify-between gap-2">
                  <FormMessage />
                  {skuAuto ? (
                    <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                      Auto-generated
                    </span>
                  ) : null}
                </div>
              </FormItem>
            );
          }}
        />
        <FormField
          control={control}
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
          control={control}
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
          control={control}
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
            control={control}
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
  );
}
