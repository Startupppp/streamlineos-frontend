"use client";

import { useCallback } from "react";
import { useForm, useFieldArray, useWatch, Controller, type Control, type UseFormSetValue, type UseFormRegister, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { useCreateTransfer } from "@/hooks/api/inventory/stock";
import { useWarehouses, useLocations } from "@/hooks/api/inventory/warehouses";
import { useProductVariants } from "@/hooks/api/inventory/products";
import { useLots, useSerials } from "@/hooks/api/inventory/traceability";
import { getErrorMessage } from "@/lib/get-error-message";

export const newTransferSchema = z
  .object({
    fromWarehouseId: z.number().int().positive(),
    fromLocationId: z.number({ error: "From location required" }).int().positive(),
    toWarehouseId: z.number().int().positive(),
    toLocationId: z.number({ error: "To location required" }).int().positive(),
    notes: z.string().max(500).optional(),
    lines: z
      .array(z.object({
        productVariantId: z.number({ error: "Variant required" }).int().positive(),
        quantity: z.number().positive(),
        lotId: z.number().int().positive().optional(),
        serialId: z.number().int().positive().optional(),
      }))
      .min(1, "At least one line required"),
  })
  .refine((d) => d.fromLocationId !== d.toLocationId, {
    message: "From and to locations must be different",
    path: ["toLocationId"],
  });

type FormValues = z.infer<typeof newTransferSchema>;

interface WLPickerProps {
  control: Control<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  warehouses: { id: number; name: string }[];
  warehouseField: "fromWarehouseId" | "toWarehouseId";
  locationField: "fromLocationId" | "toLocationId";
  labels: [string, string];
  warehouseError?: string;
  locationError?: string;
}

function WarehouseLocationPicker({ control, setValue, warehouses, warehouseField, locationField, labels, warehouseError, locationError }: WLPickerProps) {
  const warehouseId = useWatch({ control, name: warehouseField });
  const { data: locations = [] } = useLocations(warehouseId);
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-[13px] font-medium">{labels[0]} <span className="text-destructive">*</span></Label>
        <Controller name={warehouseField} control={control} render={({ field }) => (
          <Select value={field.value > 0 ? String(field.value) : ""} onValueChange={(v) => { field.onChange(Number(v)); setValue(locationField, 0); }}>
            <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
            <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}</SelectContent>
          </Select>
        )} />
        {warehouseError && <p className="text-xs text-destructive">{warehouseError}</p>}
      </div>
      <div className="space-y-1.5">
        <Label className="text-[13px] font-medium">{labels[1]} <span className="text-destructive">*</span></Label>
        <Controller name={locationField} control={control} render={({ field }) => (
          <Select value={field.value > 0 ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))} disabled={warehouseId === 0}>
            <SelectTrigger>
              <SelectValue placeholder={warehouseId === 0 ? "Select warehouse first" : "Select location"} />
            </SelectTrigger>
            <SelectContent>{locations.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.name} ({l.code})</SelectItem>)}</SelectContent>
          </Select>
        )} />
        {locationError && <p className="text-xs text-destructive">{locationError}</p>}
      </div>
    </>
  );
}

function TrackingPicker({ index, productVariantId, control }: {
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
            <SelectTrigger className="h-6 text-[10px] px-2 flex-1">
              <SelectValue placeholder="Lot (optional)" />
            </SelectTrigger>
            <SelectContent>
              {lots.map((l) => (
                <SelectItem key={l.id} value={String(l.id)} className="text-xs">{l.lotNumber}</SelectItem>
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
            <SelectTrigger className="h-6 text-[10px] px-2 flex-1">
              <SelectValue placeholder="Serial (optional)" />
            </SelectTrigger>
            <SelectContent>
              {serials.map((s) => (
                <SelectItem key={s.id} value={String(s.id)} className="text-xs">{s.serialNumber}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </div>
  );
}

function LineRow({ index, control, register, errors, variants, canRemove, onRemove }: {
  index: number;
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  variants: { id: number; productName: string; name: string | null; sku: string }[];
  canRemove: boolean;
  onRemove: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const productVariantId = useWatch({ control, name: `lines.${index}.productVariantId` });
  return (
    <div className="space-y-1">
      <div className="flex gap-2 items-start">
        <div className="flex-1 space-y-1">
          <Controller name={`lines.${index}.productVariantId`} control={control} render={({ field }) => (
            <Select value={field.value > 0 ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))}>
              <SelectTrigger><SelectValue placeholder="Select variant" /></SelectTrigger>
              <SelectContent>
                {variants.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>{v.productName} — {v.name} ({v.sku})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )} />
          {errors.lines?.[index]?.productVariantId && (
            <p className="text-xs text-destructive">{errors.lines[index]?.productVariantId?.message}</p>
          )}
        </div>
        <div className="w-28 space-y-1">
          <Input type="number" min="0.0001" step="0.0001" placeholder="Qty"
            {...register(`lines.${index}.quantity`, { valueAsNumber: true })} />
          {errors.lines?.[index]?.quantity && (
            <p className="text-xs text-destructive">{errors.lines[index]?.quantity?.message}</p>
          )}
        </div>
        {canRemove && (
          <Button type="button" variant="ghost" size="icon" aria-label="Remove line"
            className="mt-0.5 h-7 w-7 shrink-0 text-destructive hover:text-destructive"
            data-line-idx={index} onClick={onRemove}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
      <TrackingPicker index={index} productVariantId={productVariantId} control={control} />
    </div>
  );
}

export function NewTransferSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: warehouses = [] } = useWarehouses();
  const { data: variants = [] } = useProductVariants({ activeOnly: true });
  const createMutation = useCreateTransfer();

  const { control, handleSubmit, reset, setValue, register, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(newTransferSchema),
    defaultValues: {
      fromWarehouseId: 0, fromLocationId: 0, toWarehouseId: 0, toLocationId: 0,
      notes: "", lines: [{ productVariantId: 0, quantity: 0, lotId: undefined, serialId: undefined }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const handleClose = useCallback(() => { onOpenChange(false); reset(); }, [onOpenChange, reset]);
  const handleAddLine = useCallback(() => {
    append({ productVariantId: 0, quantity: 0, lotId: undefined, serialId: undefined });
  }, [append]);
  const handleRemoveLine = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const idx = e.currentTarget.dataset.lineIdx;
    if (idx !== undefined) remove(Number(idx));
  }, [remove]);

  const onSubmit = useCallback((data: FormValues) => {
    createMutation.mutate(
      {
        fromLocationId: data.fromLocationId,
        toLocationId: data.toLocationId,
        notes: data.notes || undefined,
        lines: data.lines.map((l) => ({
          productVariantId: l.productVariantId,
          quantity: l.quantity,
          lotId: l.lotId,
          serialId: l.serialId,
        })),
      },
      {
        onSuccess: () => { toast.success("Transfer created"); handleClose(); },
        onError: (err: Error) => toast.error(getErrorMessage(err)),
      },
    );
  }, [createMutation, handleClose]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b">
          <SheetTitle>New Transfer</SheetTitle>
          <SheetDescription>Move stock between warehouse locations.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <WarehouseLocationPicker
                control={control} setValue={setValue} warehouses={warehouses}
                warehouseField="fromWarehouseId" locationField="fromLocationId"
                labels={["From Warehouse", "From Location"]}
                warehouseError={errors.fromWarehouseId?.message}
                locationError={errors.fromLocationId?.message}
              />
              <WarehouseLocationPicker
                control={control} setValue={setValue} warehouses={warehouses}
                warehouseField="toWarehouseId" locationField="toLocationId"
                labels={["To Warehouse", "To Location"]}
                warehouseError={errors.toWarehouseId?.message}
                locationError={errors.toLocationId?.message}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Notes</Label>
              <Textarea {...register("notes")} placeholder="Reason or notes for this transfer…" rows={2} />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[13px] font-medium">Lines <span className="text-destructive">*</span></Label>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={handleAddLine}>
                  <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />Add line
                </Button>
              </div>
              {fields.map((f, index) => (
                <LineRow
                  key={f.id}
                  index={index}
                  control={control}
                  register={register}
                  errors={errors}
                  variants={variants}
                  canRemove={fields.length > 1}
                  onRemove={handleRemoveLine}
                />
              ))}
            </div>
          </div>
          <SheetFooter className="shrink-0 px-6 py-4 border-t">
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button type="button" variant="outline" onClick={handleClose} disabled={createMutation.isPending}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating…" : "Create Transfer"}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
