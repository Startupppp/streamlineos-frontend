"use client";

import { useCallback, useMemo } from "react";
import { useForm, useFieldArray, useWatch, Controller, type Control, type UseFormSetValue, type UseFormRegister, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetBody } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTransfer } from "@/hooks/api/inventory/stock";
import { useWarehouses, useLocations } from "@/hooks/api/inventory/warehouses";
import { useProductVariants } from "@/hooks/api/inventory/products";
import { useLots, useSerials } from "@/hooks/api/inventory/traceability";
import { getErrorMessage } from "@/lib/get-error-message";

const NOTES_MAX = 1000;

export const newTransferSchema = z
  .object({
    fromWarehouseId: z.number({ error: "From warehouse required" }).int().positive({ message: "From warehouse required" }),
    fromLocationId: z.number({ error: "From location required" }).int().positive({ message: "From location required" }),
    toWarehouseId: z.number({ error: "To warehouse required" }).int().positive({ message: "To warehouse required" }),
    toLocationId: z.number({ error: "To location required" }).int().positive({ message: "To location required" }),
    notes: z
      .string()
      .max(NOTES_MAX, `Notes must be ${NOTES_MAX} characters or fewer`)
      .transform((v) => v.trim())
      .optional(),
    lines: z
      .array(
        z.object({
          productVariantId: z.number({ error: "Variant required" }).int().positive({ message: "Variant required" }),
          quantity: z
            .number({ error: "Quantity must be a number" })
            .positive({ message: "Quantity must be greater than 0" }),
          lotId: z.number().int().positive().optional(),
          serialId: z.number().int().positive().optional(),
        }),
      )
      .min(1, "At least one line required"),
  })
  .refine((d) => d.fromLocationId !== d.toLocationId, {
    message: "From and to locations cannot be the same",
    path: ["toLocationId"],
  });

type FormValues = z.infer<typeof newTransferSchema>;

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

function WarehouseLocationPicker({
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
        <Label className="text-[13px] font-medium">
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
        <Label className="text-[13px] font-medium">
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

function TrackingPicker({
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
            <SelectTrigger className="h-6 text-[10px] px-2 flex-1">
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
            <SelectTrigger className="h-6 text-[10px] px-2 flex-1">
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

function LineRow({
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove line"
            className="mt-0.5 h-7 w-7 shrink-0 text-destructive hover:text-destructive"
            data-line-idx={index}
            onClick={onRemove}
          >
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

  const { control, handleSubmit, reset, setValue, register, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(newTransferSchema),
    defaultValues: {
      fromWarehouseId: 0,
      fromLocationId: 0,
      toWarehouseId: 0,
      toLocationId: 0,
      notes: "",
      lines: [{ productVariantId: 0, quantity: 0, lotId: undefined, serialId: undefined }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const notesValue = watch("notes") ?? "";
  const fromLocationId = watch("fromLocationId");
  const toLocationId = watch("toLocationId");

  const variantOptions = useMemo<ComboboxOption[]>(
    () =>
      variants.map((v) => ({
        value: String(v.id),
        label: v.productName,
        sublabel: `${v.name} · ${v.sku}`,
      })),
    [variants],
  );

  const warehouseList = useMemo(
    () => warehouses.map((w) => ({ id: w.id, name: w.name, code: w.code })),
    [warehouses],
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
    reset();
  }, [onOpenChange, reset]);

  const handleAddLine = useCallback(() => {
    append({ productVariantId: 0, quantity: 0, lotId: undefined, serialId: undefined });
  }, [append]);

  const handleRemoveLine = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const idx = e.currentTarget.dataset.lineIdx;
      if (idx !== undefined) remove(Number(idx));
    },
    [remove],
  );

  const onSubmit = useCallback(
    (data: FormValues) => {
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
          onSuccess: () => {
            toast.success("Transfer created");
            handleClose();
          },
          onError: (err: Error) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [createMutation, handleClose],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b">
          <SheetTitle>New Transfer</SheetTitle>
          <SheetDescription>Move stock between warehouse locations.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SheetBody className="space-y-4 px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <WarehouseLocationPicker
                control={control}
                setValue={setValue}
                warehouses={warehouseList}
                warehouseField="fromWarehouseId"
                locationField="fromLocationId"
                excludeLocationId={toLocationId > 0 ? toLocationId : undefined}
                labels={["From Warehouse", "From Location"]}
                warehouseError={errors.fromWarehouseId?.message}
                locationError={errors.fromLocationId?.message}
              />
              <WarehouseLocationPicker
                control={control}
                setValue={setValue}
                warehouses={warehouseList}
                warehouseField="toWarehouseId"
                locationField="toLocationId"
                excludeLocationId={fromLocationId > 0 ? fromLocationId : undefined}
                labels={["To Warehouse", "To Location"]}
                warehouseError={errors.toWarehouseId?.message}
                locationError={errors.toLocationId?.message}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[13px] font-medium">Notes</Label>
                <span className={`text-[11px] tabular-nums ${notesValue.length > NOTES_MAX ? "text-destructive" : "text-muted-foreground"}`}>
                  {notesValue.length}/{NOTES_MAX}
                </span>
              </div>
              <Textarea
                {...register("notes")}
                placeholder="Reason or notes for this transfer…"
                rows={2}
                maxLength={NOTES_MAX}
              />
              {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[13px] font-medium">
                  Lines <span className="text-destructive">*</span>
                </Label>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={handleAddLine}>
                  <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  Add line
                </Button>
              </div>
              {errors.lines?.root && (
                <p className="text-xs text-destructive">{errors.lines.root.message}</p>
              )}
              {fields.map((f, index) => (
                <LineRow
                  key={f.id}
                  index={index}
                  control={control}
                  register={register}
                  errors={errors}
                  variantOptions={variantOptions}
                  canRemove={fields.length > 1}
                  onRemove={handleRemoveLine}
                />
              ))}
            </div>
          </SheetBody>
          <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
            <div className="grid w-full grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={createMutation.isPending}>
                Cancel
              </Button>
              <LoadingButton type="submit" isPending={createMutation.isPending} loadingText="Creating…">
                Create Transfer
              </LoadingButton>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
