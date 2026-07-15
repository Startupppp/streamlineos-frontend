"use client";

import { memo, useCallback } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Trash2 } from "lucide-react";
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
import { useLots, useSerials } from "@/hooks/api/inventory/traceability";

interface InspectionLineRowProps {
  index: number;
  canRemove: boolean;
  onRemove: (index: number) => void;
}

export const InspectionLineRow = memo(function InspectionLineRow({
  index,
  canRemove,
  onRemove,
}: InspectionLineRowProps) {
  const form = useFormContext();
  const rawLineErrors = form.formState.errors.lines;
  const lineErrors = Array.isArray(rawLineErrors)
    ? (rawLineErrors[index] as { variantId?: { message?: string }; qty?: { message?: string } } | undefined)
    : undefined;
  const variantId = form.watch(`lines.${index}.variantId`);
  const numericVariantId = Number(variantId);
  const enabled = Number.isInteger(numericVariantId) && numericVariantId > 0;

  const { data: lotsData } = useLots(
    enabled ? { variantId: numericVariantId, status: "ACTIVE", limit: 100 } : undefined,
  );
  const { data: serialsData } = useSerials(
    enabled ? { variantId: numericVariantId, status: "IN_STOCK", limit: 100 } : undefined,
  );

  const lots = lotsData?.items ?? [];
  const serials = serialsData?.items ?? [];

  const handleRemove = useCallback(() => onRemove(index), [index, onRemove]);

  return (
    <div className="rounded-md border border-border p-3 space-y-2 relative">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground/80">Line {index + 1}</span>
        {canRemove && (
          <button
            type="button"
            onClick={handleRemove}
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 space-y-1">
          <Label className="text-[11px] font-semibold text-foreground/80">Variant *</Label>
          <Controller
            control={form.control}
            name={`lines.${index}.variantId`}
            render={({ field }) => (
              <ProductVariantCombobox
                value={field.value}
                onChange={(next) => {
                  field.onChange(next);
                  form.setValue(`lines.${index}.lotId`, "");
                  form.setValue(`lines.${index}.serialId`, "");
                }}
                className="text-xs"
              />
            )}
          />
          {lineErrors?.variantId && (
            <p className="text-[10px] text-destructive">{lineErrors.variantId.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-semibold text-foreground/80">Qty *</Label>
          <Input
            className="text-xs"
            type="number"
            placeholder="Qty"
            {...form.register(`lines.${index}.qty`)}
          />
          {lineErrors?.qty && (
            <p className="text-[10px] text-destructive">{lineErrors.qty.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-semibold text-foreground/80">Lot</Label>
          <Controller
            control={form.control}
            name={`lines.${index}.lotId`}
            render={({ field }) => (
              <Select
                value={field.value || "none"}
                onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                disabled={!enabled || lots.length === 0}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder={enabled ? "Optional" : "Select variant first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {lots.map((lot) => (
                    <SelectItem key={lot.id} value={String(lot.id)}>
                      {lot.lotNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-semibold text-foreground/80">Serial</Label>
          <Controller
            control={form.control}
            name={`lines.${index}.serialId`}
            render={({ field }) => (
              <Select
                value={field.value || "none"}
                onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                disabled={!enabled || serials.length === 0}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder={enabled ? "Optional" : "Select variant first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {serials.map((serial) => (
                    <SelectItem key={serial.id} value={String(serial.id)}>
                      {serial.serialNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
    </div>
  );
});
