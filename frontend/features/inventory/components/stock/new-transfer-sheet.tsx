"use client";

import { useCallback, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetBody } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { type ComboboxOption } from "@/components/ui/combobox";
import { useCreateTransfer } from "@/hooks/api/inventory/stock";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";
import { useProductVariants } from "@/hooks/api/inventory/products";
import { getErrorMessage } from "@/lib/get-error-message";
import { newTransferSchema, NOTES_MAX, type FormValues } from "./new-transfer-schema";
import { WarehouseLocationPicker, LineRow } from "./new-transfer-line-fields";

export function NewTransferSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: warehousesResponse } = useWarehouses();
  const warehouses = warehousesResponse?.items ?? [];
  const { data: variants = [] } = useProductVariants({ activeOnly: true });
  const createMutation = useCreateTransfer();

  const form = useForm<FormValues>({
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

  const { control, handleSubmit, reset, setValue, register, watch, formState: { errors } } = form;

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
        <Form {...form}>
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
            <FormField
              control={control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Notes</FormLabel>
                    <span className={`text-dense tabular-nums ${notesValue.length > NOTES_MAX ? "text-destructive" : "text-muted-foreground"}`}>
                      {notesValue.length}/{NOTES_MAX}
                    </span>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="Reason or notes for this transfer…"
                      rows={2}
                      maxLength={NOTES_MAX}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-label font-medium">
                  Lines <span className="text-destructive">*</span>
                </Label>
                <AnimatedIconButton type="button" icon={PlusIcon} iconSize={14} iconClassName="mr-1" variant="outline" size="sm" className="text-xs" onClick={handleAddLine}>
                  Add line
                </AnimatedIconButton>
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
        </Form>
      </SheetContent>
    </Sheet>
  );
}
