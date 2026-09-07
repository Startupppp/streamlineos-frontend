"use client";

import { useMemo } from "react";
import { useWatch, Controller, type Control, type UseFormSetValue, type UseFormRegister, type FieldErrors } from "react-hook-form";
import { Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocations } from "@/hooks/api/inventory/warehouses";
import { useLots, useSerials } from "@/hooks/api/inventory/traceability";
import type { FormValues } from "./new-transfer-schema";

interface WLPickerProps {
  control: Control<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  warehouses: { id: number; name: string; code: string }[];
  warehouseField: "fromWarehouseId" | "toWarehouseId";
  locationField: "fromLocationId" | "toLocationId";
  excludeLocationId?: number;
  labels: [string, string];
  warehouseError?: string;
  locationError?: string;
}

export function WarehouseLocationPicker({
  control,
  setValue,
  warehouses,
  warehouseField,
  locationField,
  excludeLocationId,
  labels,
  warehouseError,
  locationError,
}: WLPickerProps) {
  const warehouseId = useWatch({ control, name: warehouseField });
  const { data: allLocations = [], isLoading: locLoading } = useLocations(warehouseId > 0 ? warehouseId : 0);

  const warehouseOptions = useMemo<ComboboxOption[]>(
    () => warehouses.map((w) => ({ value: String(w.id), label: w.name, sublabel: w.code })),
    [warehouses],
  );

  const locationOptions = useMemo<ComboboxOption[]>(
    () =>
      allLocations
        .filter((l) => l.id !== excludeLocationId)
        .map((l) => ({ value: String(l.id), label: l.name, sublabel: l.code })),
    [allLocations, excludeLocationId],
  );

  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-label font-medium">
          {labels[0]} <span className="text-destructive">*</span>
        </Label>
        <Controller
          name={warehouseField}
          control={control}
          render={({ field }) => (
            <Combobox
              options={warehouseOptions}
              value={field.value > 0 ? String(field.value) : ""}
              onChange={(v) => {
                field.onChange(v ? Number(v) : 0);
                setValue(locationField, 0);
              }}
              placeholder="Select warehouse"
              searchPlaceholder="Search warehouses…"
              emptyText="No warehouses found"
            />
          )}
        />
        {warehouseError && <p className="text-xs text-destructive">{warehouseError}</p>}
      </div>
      <div className="space-y-1.5">
        <Label className="text-label font-medium">
          {labels[1]} <span className="text-destructive">*</span>
        </Label>
        <Controller
          name={locationField}
          control={control}
          render={({ field }) => (
            <Combobox
              options={locationOptions}
              value={field.value > 0 ? String(field.value) : ""}
              onChange={(v) => field.onChange(v ? Number(v) : 0)}
              placeholder={warehouseId === 0 ? "Select warehouse first" : locLoading ? "Loading…" : "Select location"}
              searchPlaceholder="Search locations…"
              emptyText={warehouseId === 0 ? "Select a warehouse first" : "No locations found"}
              disabled={warehouseId === 0}
            />
          )}
        />
        {locationError && <p className="text-xs text-destructive">{locationError}</p>}
      </div>
    </>
  );
}

export function TrackingPicker({
  index,
  productVariantId,
  control,
}: {
  index: number;
  productVariantId: number;
  control: Control<FormValues>;
}) {
  const enabled = productVariantId > 0;
  const { data: lotsData } = useLots(enabled ? { variantId: productVariantId, status: "ACTIVE", limit: 100 } : undefined);
  const { data: serialsData } = useSerials(enabled ? { variantId: productVariantId, status: "IN_STOCK", limit: 100 } : undefined);
  const lots = lotsData?.items ?? [];
  const serials = serialsData?.items ?? [];

  if (!enabled) return null;

  return (
    <div className="flex gap-2 mt-1">
      <Controller
        name={`lines.${index}.lotId`}
        control={control}
        render={({ field }) => (
          <Select
            value={field.value !== undefined ? String(field.value) : ""}
            onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
          >
            <SelectTrigger className="flex-1 text-xs">
              <SelectValue placeholder="Lot (optional)" />
            </SelectTrigger>
            <SelectContent>
              {lots.map((l) => (
                <SelectItem key={l.id} value={String(l.id)} className="text-xs">
                  {l.lotNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <Controller
        name={`lines.${index}.serialId`}
        control={control}
        render={({ field }) => (
          <Select
            value={field.value !== undefined ? String(field.value) : ""}
            onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
          >
            <SelectTrigger className="flex-1 text-xs">
              <SelectValue placeholder="Serial (optional)" />
            </SelectTrigger>
            <SelectContent>
              {serials.map((s) => (
                <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                  {s.serialNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </div>
  );
}

export function LineRow({
  index,
  control,
  register,
  errors,
  variantOptions,
  canRemove,
  onRemove,
}: {
  index: number;
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  variantOptions: ComboboxOption[];
  canRemove: boolean;
  onRemove: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const productVariantId = useWatch({ control, name: `lines.${index}.productVariantId` });
  return (
    <div className="space-y-1">
      <div className="flex gap-2 items-start">
        <div className="flex-1 space-y-1">
          <Controller
            name={`lines.${index}.productVariantId`}
            control={control}
            render={({ field }) => (
              <Combobox
                options={variantOptions}
                value={field.value > 0 ? String(field.value) : ""}
                onChange={(v) => field.onChange(v ? Number(v) : 0)}
                placeholder="Select variant"
                searchPlaceholder="Search by product, SKU…"
                emptyText="No variants found"
              />
            )}
          />
          {errors.lines?.[index]?.productVariantId && (
            <p className="text-xs text-destructive">{errors.lines[index]?.productVariantId?.message}</p>
          )}
        </div>
        <div className="w-28 space-y-1">
          <Input
            type="number"
            min="0.0001"
            step="0.0001"
            placeholder="Qty"
            {...register(`lines.${index}.quantity`, { valueAsNumber: true })}
          />
          {errors.lines?.[index]?.quantity && (
            <p className="text-xs text-destructive">{errors.lines[index]?.quantity?.message}</p>
          )}
        </div>
        {canRemove && (
          <AnimatedIconButton
            type="button"
            icon={Trash2Icon}
            iconSize={16}
            variant="ghost"
            size="icon"
            aria-label="Remove line"
            className="mt-0.5 h-7 w-7 shrink-0 text-destructive hover:text-destructive"
            data-line-idx={index}
            onClick={onRemove}
          />
        )}
      </div>
      <TrackingPicker index={index} productVariantId={productVariantId} control={control} />
    </div>
  );
}
