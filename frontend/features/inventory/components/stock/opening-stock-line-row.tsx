"use client";

import { memo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductVariantCombobox } from "@/components/inventory/product-variant-combobox";
import { useLocations } from "@/hooks/api/inventory/warehouses";
import type { FormValues } from "./opening-stock-schema";

interface LineRowProps {
  index: number;
  control: ReturnType<typeof useForm<FormValues>>["control"];
  register: ReturnType<typeof useForm<FormValues>>["register"];
  watch: ReturnType<typeof useForm<FormValues>>["watch"];
  setValue: ReturnType<typeof useForm<FormValues>>["setValue"];
  errors: ReturnType<typeof useForm<FormValues>>["formState"]["errors"];
  onRemove: (index: number) => void;
  canRemove: boolean;
  warehouses: { id: number; name: string }[];
}

export const LineRow = memo(function LineRow({
  index,
  control,
  register,
  watch,
  setValue,
  errors,
  onRemove,
  canRemove,
  warehouses,
}: LineRowProps) {
  const warehouseId = watch(`lines.${index}.warehouseId`);
  const { data: locations = [] } = useLocations(Number(warehouseId) || 0);

  const lineErrors = errors.lines?.[index];

  const handleWarehouseChange = useCallback(
    (val: string) => {
      setValue(`lines.${index}.warehouseId`, val, { shouldValidate: true });
      setValue(`lines.${index}.locationId`, "", { shouldValidate: false });
    },
    [index, setValue],
  );

  const handleLocationChange = useCallback(
    (val: string) => {
      setValue(`lines.${index}.locationId`, val, { shouldValidate: true });
    },
    [index, setValue],
  );

  const handleRemove = useCallback(() => onRemove(index), [index, onRemove]);

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground">Line {index + 1}</span>
        {canRemove && (
          <AnimatedIconButton
            type="button"
            icon={Trash2Icon}
            iconSize={14}
            iconClassName="mr-1"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleRemove}
          >
            Remove
          </AnimatedIconButton>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs text-muted-foreground">Variant <span className="text-destructive">*</span></Label>
          <Controller
            control={control}
            name={`lines.${index}.variantId`}
            render={({ field }) => (
              <ProductVariantCombobox
                value={field.value}
                onChange={field.onChange}
                className="text-xs"
              />
            )}
          />
          {lineErrors?.variantId && (
            <p className="text-xs text-destructive">{lineErrors.variantId.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Warehouse <span className="text-destructive">*</span></Label>
          <Controller
            control={control}
            name={`lines.${index}.warehouseId`}
            render={({ field }) => (
              <Select value={field.value} onValueChange={handleWarehouseChange}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select warehouse…" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {lineErrors?.warehouseId && (
            <p className="text-xs text-destructive">{lineErrors.warehouseId.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Location <span className="text-destructive">*</span></Label>
          <Controller
            control={control}
            name={`lines.${index}.locationId`}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={handleLocationChange}
                disabled={!warehouseId}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder={!warehouseId ? "Select warehouse first" : "Select location…"} />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.name} ({l.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {lineErrors?.locationId && (
            <p className="text-xs text-destructive">{lineErrors.locationId.message}</p>
          )}
          {!warehouseId && !lineErrors?.locationId && (
            <p className="text-xs text-muted-foreground">Select a warehouse first.</p>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Quantity <span className="text-destructive">*</span></Label>
          <Input
            type="number"
            min="0.0001"
            step="any"
            placeholder="Enter quantity"
            className="text-xs"
            {...register(`lines.${index}.qty`)}
          />
          {lineErrors?.qty && (
            <p className="text-xs text-destructive">{lineErrors.qty.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Unit Cost (optional)</Label>
          <Input
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            className="text-xs"
            {...register(`lines.${index}.unitCost`)}
          />
          {lineErrors?.unitCost && (
            <p className="text-xs text-destructive">{lineErrors.unitCost.message}</p>
          )}
        </div>
      </div>
    </div>
  );
});
