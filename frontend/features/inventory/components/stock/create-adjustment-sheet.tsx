"use client";

import { useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetBody } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateAdjustment, type AdjustmentReason } from "@/hooks/api/inventory/stock";
import { useWarehouses, useLocations } from "@/hooks/api/inventory/warehouses";
import { useProductVariants } from "@/hooks/api/inventory/products";
import { getErrorMessage } from "@/lib/get-error-message";

const schema = z.object({
  warehouseId: z.number({ error: "Warehouse is required" }).int().positive(),
  locationId: z.number({ error: "Location is required" }).int().positive(),
  productVariantId: z.number({ error: "Product variant is required" }).int().positive(),
  adjustmentType: z.enum(["IN", "OUT"]),
  quantity: z.number({ error: "Quantity is required" }).min(0.0001, "Must be positive"),
  reason: z.enum(["PURCHASE", "SALE", "RETURN", "DAMAGE", "EXPIRY", "THEFT", "RECOUNT", "OTHER"]),
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

const REASON_LABELS: Record<AdjustmentReason, string> = {
  PURCHASE: "Purchase", SALE: "Sale", RETURN: "Return", DAMAGE: "Damage",
  EXPIRY: "Expiry", THEFT: "Theft / Loss", RECOUNT: "Recount", OTHER: "Other",
};

const REASONS: AdjustmentReason[] = ["PURCHASE", "SALE", "RETURN", "DAMAGE", "EXPIRY", "THEFT", "RECOUNT", "OTHER"];

interface CreateAdjustmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAdjustmentSheet({ open, onOpenChange }: CreateAdjustmentSheetProps) {
  const { data: warehouses = [], isLoading: wLoading } = useWarehouses();
  const { data: variants = [], isLoading: vLoading } = useProductVariants({ activeOnly: true });
  const createMutation = useCreateAdjustment();

  const {
    control, handleSubmit, watch, reset, resetField, register,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { adjustmentType: "IN", reason: "RECOUNT" },
  });

  const warehouseId = watch("warehouseId");
  const { data: locations = [], isLoading: lLoading } = useLocations(warehouseId ?? 0);

  const handleClose = useCallback(() => {
    reset({ adjustmentType: "IN", reason: "RECOUNT" });
    onOpenChange(false);
  }, [reset, onOpenChange]);

  function handleSheetChange(nextOpen: boolean): void {
    if (!nextOpen) handleClose();
  }

  function onSubmit(values: FormValues): void {
    createMutation.mutate(
      {
        productVariantId: values.productVariantId,
        locationId: values.locationId,
        adjustmentType: values.adjustmentType,
        quantity: values.quantity,
        reason: values.reason,
        notes: values.notes?.trim() || undefined,
      },
      {
        onSuccess: (result) => {
          const msg =
            result.status === "PENDING_APPROVAL"
              ? "Adjustment created — awaiting approval"
              : "Adjustment created";
          toast.success(msg);
          reset();
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  const handleCreate = handleSubmit(onSubmit);

  return (
    <Sheet open={open} onOpenChange={handleSheetChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col overflow-hidden">
        <SheetHeader className="shrink-0 border-b border-border bg-muted/40 p-6 pb-4 pr-12 text-left">
          <SheetTitle>New Stock Adjustment</SheetTitle>
          <SheetDescription>Manually adjust stock quantities to correct discrepancies.</SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-4 px-6 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="adj-warehouse" className="text-[13px] font-medium">
              Warehouse <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={control}
              name="warehouseId"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ""}
                  disabled={wLoading}
                  onValueChange={(v) => { field.onChange(Number(v)); resetField("locationId"); }}
                >
                  <SelectTrigger id="adj-warehouse">
                    <SelectValue placeholder={wLoading ? "Loading…" : "Select warehouse"} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((wh) => (
                      <SelectItem key={wh.id} value={String(wh.id)}>{wh.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.warehouseId && <p className="text-xs text-destructive">{errors.warehouseId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adj-location" className="text-[13px] font-medium">
              Location <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={control}
              name="locationId"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ""}
                  disabled={!warehouseId || lLoading}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger id="adj-location">
                    <SelectValue
                      placeholder={
                        !warehouseId ? "Select warehouse first" : lLoading ? "Loading…" : "Select location"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={String(loc.id)}>
                        {loc.name} ({loc.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.locationId && <p className="text-xs text-destructive">{errors.locationId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adj-variant" className="text-[13px] font-medium">
              Product Variant <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={control}
              name="productVariantId"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ""}
                  disabled={vLoading}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger id="adj-variant">
                    <SelectValue placeholder={vLoading ? "Loading…" : "Select product variant"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {variants.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.productName} — {v.name} ({v.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.productVariantId && <p className="text-xs text-destructive">{errors.productVariantId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adj-type" className="text-[13px] font-medium">
              Direction <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={control}
              name="adjustmentType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="adj-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">In (Add stock)</SelectItem>
                    <SelectItem value="OUT">Out (Remove stock)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adj-qty" className="text-[13px] font-medium">
              Quantity <span className="text-destructive">*</span>
            </Label>
            <Input
              {...register("quantity", { valueAsNumber: true })}
              id="adj-qty"
              type="number"
              min="0.0001"
              step="0.0001"
              placeholder="0"
            />
            {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adj-reason" className="text-[13px] font-medium">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={control}
              name="reason"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="adj-reason"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REASONS.map((r) => (
                      <SelectItem key={r} value={r}>{REASON_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adj-notes" className="text-[13px] font-medium">Notes</Label>
            <Textarea
              {...register("notes")}
              id="adj-notes"
              placeholder="Additional details…"
              rows={3}
            />
            {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
          </div>
        </SheetBody>

        <SheetFooter className="gap-2 border-t border-border bg-muted/30 px-6 py-4">
          <Button variant="outline" className="flex-1" onClick={handleClose} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <LoadingButton className="flex-1" isPending={createMutation.isPending} loadingText="Creating…" onClick={handleCreate}>
            Create Adjustment
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
