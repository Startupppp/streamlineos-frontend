"use client";

import { memo, useState } from "react";
import { useForm, useFieldArray, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AppSheet } from "@/components/shared/app-sheet";
import { LoadingButton } from "@/components/ui/loading-button";
import { useReceiveGoods } from "@/hooks/api/inventory";
import { WarehouseSelect } from "@/components/inventory/warehouse-select";
import { LocationSelect } from "@/components/inventory/location-select";
import type { ReceiveGoodsInput, ReceiveGoodsLineInput } from "@/types/inventory";
import type { LocalPurchaseOrder } from "@/hooks/api/inventory/purchase-orders";
import { getErrorMessage } from "@/lib/get-error-message";
import type { TrackingMethod } from "@/types/inventory";

const grnLineSchema = z.object({
  poLineId: z.number(),
  quantityReceived: z.number().min(0),
  qualityStatus: z.enum(["ACCEPTED", "REJECTED"]),
  rejectionReason: z.string().optional(),
  lotNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  manufactureDate: z.string().optional(),
  serialNumbers: z.string().optional(),
});

const grnSchema = z.object({
  locationId: z.number({ error: "Location is required" }).int().positive(),
  notes: z.string().max(500).optional(),
  lines: z
    .array(grnLineSchema)
    .refine(
      (lines) =>
        lines.every(
          (l) =>
            l.qualityStatus === "ACCEPTED" ||
            (l.rejectionReason && l.rejectionReason.length > 0),
        ),
      { message: "Rejection reason required for rejected lines" },
    ),
});

type GrnFormValues = z.infer<typeof grnSchema>;

interface DraftLineMeta {
  productName: string;
  sku: string | null;
  ordered: number;
  alreadyReceived: number;
  trackingMethod: TrackingMethod;
}

export interface ReceiveGoodsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  po: LocalPurchaseOrder;
}

interface GrnLineRowProps {
  meta: DraftLineMeta;
  index: number;
  control: Control<GrnFormValues>;
}

const GrnLineRow = memo(function GrnLineRow({ meta, index, control }: GrnLineRowProps) {
  const qualityStatus = useWatch({ control, name: `lines.${index}.qualityStatus` });
  const quantityReceived = useWatch({ control, name: `lines.${index}.quantityReceived` });
  const serialNumbersValue = useWatch({ control, name: `lines.${index}.serialNumbers` });
  const serialCount = serialNumbersValue
    ? serialNumbersValue
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean).length
    : 0;

  return (
    <div className="rounded-md border border-border/60 p-3 space-y-2">
      <div>
        <div className="text-sm font-medium">{meta.productName}</div>
        {meta.sku && <div className="text-xs text-muted-foreground font-mono">{meta.sku}</div>}
        <div className="text-xs text-muted-foreground mt-0.5">
          Ordered: {meta.ordered.toFixed(2)} · Received: {meta.alreadyReceived.toFixed(2)}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <FormField
          control={control}
          name={`lines.${index}.quantityReceived`}
          render={({ field }) => (
            <FormItem className="flex items-center gap-1.5">
              <FormLabel className="text-xs text-muted-foreground whitespace-nowrap">
                Qty received
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  max={meta.ordered - meta.alreadyReceived}
                  step="0.0001"
                  className="w-28 text-right tabular-nums"
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`lines.${index}.qualityStatus`}
          render={({ field }) => (
            <FormItem className="ml-auto">
              <FormControl>
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="flex gap-3"
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="ACCEPTED" id={`q-accepted-${index}`} />
                    <Label htmlFor={`q-accepted-${index}`} className="text-xs cursor-pointer">
                      Accepted
                    </Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="REJECTED" id={`q-rejected-${index}`} />
                    <Label htmlFor={`q-rejected-${index}`} className="text-xs cursor-pointer">
                      Rejected
                    </Label>
                  </div>
                </RadioGroup>
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      {qualityStatus === "REJECTED" && (
        <FormField
          control={control}
          name={`lines.${index}.rejectionReason`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Rejection reason *</FormLabel>
              <FormControl>
                <Input placeholder="Describe the reason for rejection" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      {meta.trackingMethod === "LOT" && (
        <div className="grid grid-cols-3 gap-2">
          <FormField
            control={control}
            name={`lines.${index}.lotNumber`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Lot number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. LOT-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`lines.${index}.expiryDate`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Expiry date</FormLabel>
                <FormControl>
                  <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="text-sm" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`lines.${index}.manufactureDate`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Manufacture date</FormLabel>
                <FormControl>
                  <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="text-sm" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
      {meta.trackingMethod === "SERIAL" && (
        <FormField
          control={control}
          name={`lines.${index}.serialNumbers`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">
                Serial numbers
                <span className="ml-2 text-muted-foreground">
                  {serialCount} / {quantityReceived > 0 ? quantityReceived.toFixed(0) : "?"} entered
                </span>
              </FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder={"One serial per line or comma-separated"}
                  className="resize-none font-mono text-xs"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
});

export function ReceiveGoodsSheet({ open, onOpenChange, po }: ReceiveGoodsSheetProps) {
  const receiveMutation = useReceiveGoods(po.id);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number>(po.warehouseId ?? 0);
  const effectiveWarehouseId = selectedWarehouseId > 0 ? selectedWarehouseId : undefined;

  const pendingLines = po.lines.filter(
    (l) => Number(l.quantity) > Number(l.quantityReceived),
  );
  const lineMetas: DraftLineMeta[] = pendingLines.map((l) => ({
    productName: l.productVariant?.product?.name ?? l.productVariant?.name ?? "Product",
    sku: l.productVariant?.sku ?? null,
    ordered: Number(l.quantity),
    alreadyReceived: Number(l.quantityReceived),
    trackingMethod: l.productVariant?.product?.trackingMethod ?? "NONE",
  }));

  const form = useForm<GrnFormValues>({
    resolver: zodResolver(grnSchema),
    defaultValues: {
      notes: "",
      lines: pendingLines.map((l) => ({
        poLineId: l.id,
        quantityReceived: Math.max(0, Number(l.quantity) - Number(l.quantityReceived)),
        qualityStatus: "ACCEPTED" as const,
        rejectionReason: "",
        lotNumber: "",
        expiryDate: "",
        manufactureDate: "",
        serialNumbers: "",
      })),
    },
  });

  const { fields } = useFieldArray({ control: form.control, name: "lines" });

  function handleClose(): void {
    form.reset();
    setSelectedWarehouseId(po.warehouseId ?? 0);
    onOpenChange(false);
  }

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      form.reset();
      setSelectedWarehouseId(po.warehouseId ?? 0);
    }
    onOpenChange(nextOpen);
  }

  async function onSubmit(values: GrnFormValues): Promise<void> {
    const indexedLines = values.lines.map((l, origIdx) => ({ l, meta: lineMetas[origIdx] }));
    const activeIndexed = indexedLines.filter(({ l }) => l.quantityReceived > 0);

    if (activeIndexed.length === 0) {
      toast.error("Enter quantity for at least one line");
      return;
    }

    for (let i = 0; i < activeIndexed.length; i++) {
      const entry = activeIndexed[i];
      if (!entry) continue;
      const { l: line, meta } = entry;
      if (meta?.trackingMethod === "SERIAL") {
        const serials = (line.serialNumbers ?? "")
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (serials.length !== Math.round(line.quantityReceived)) {
          toast.error(
            `Serial count mismatch on line ${i + 1}: ${serials.length} entered, ${Math.round(line.quantityReceived)} expected`,
          );
          return;
        }
      }
    }

    const today = new Date().toISOString().slice(0, 10);

    const payload: ReceiveGoodsInput = {
      locationId: values.locationId,
      receivedDate: today,
      notes: values.notes?.trim() || undefined,
      lines: activeIndexed.map<ReceiveGoodsLineInput>(({ l, meta }) => {
        const serials =
          meta?.trackingMethod === "SERIAL" && l.serialNumbers
            ? l.serialNumbers
                .split(/[\n,]/)
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined;
        return {
          poLineId: l.poLineId,
          quantityReceived: l.quantityReceived,
          qualityStatus: l.qualityStatus,
          rejectionReason: l.qualityStatus === "REJECTED" ? l.rejectionReason : undefined,
          lotNumber: meta?.trackingMethod === "LOT" ? l.lotNumber?.trim() || undefined : undefined,
          expiryDate: meta?.trackingMethod === "LOT" ? l.expiryDate?.trim() || undefined : undefined,
          manufactureDate:
            meta?.trackingMethod === "LOT" ? l.manufactureDate?.trim() || undefined : undefined,
          serialNumbers: serials,
        };
      }),
    };

    try {
      const grn = await receiveMutation.mutateAsync(payload);
      toast.success(`GRN ${grn.grnNumber} recorded`);
      handleClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Receive Goods"
      description="Record quantities received for this purchase order."
      footer={
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            form="receive-goods-form"
            size="sm"
            isPending={receiveMutation.isPending}
            loadingText="Recording…"
          >
            Record receipt
          </LoadingButton>
        </div>
      }
    >
      <Form {...form}>
        <form id="receive-goods-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {!po.warehouseId && (
            <FormItem>
              <FormLabel>Warehouse *</FormLabel>
              <WarehouseSelect
                value={selectedWarehouseId > 0 ? String(selectedWarehouseId) : ""}
                onChange={(v) => {
                  setSelectedWarehouseId(Number(v));
                  form.resetField("locationId");
                }}
                activeOnly
              />
            </FormItem>
          )}
          <FormField
            control={form.control}
            name="locationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Receive at Location *</FormLabel>
                <FormControl>
                  <LocationSelect
                    warehouseId={effectiveWarehouseId}
                    value={field.value != null && field.value > 0 ? String(field.value) : ""}
                    onChange={(v) => field.onChange(Number(v))}
                    activeOnly
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="space-y-2">
            {fields.map((field, index) => {
              const meta = lineMetas[index];
              if (!meta) return null;
              return (
                <GrnLineRow
                  key={field.id}
                  meta={meta}
                  index={index}
                  control={form.control}
                />
              );
            })}
          </div>
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    rows={2}
                    placeholder="Any notes about this receipt"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </AppSheet>
  );
}
