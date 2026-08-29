"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { useCreateGrnDraft, type GrnDraftLineInput } from "@/hooks/api/inventory/operations";
import { WarehouseSelect } from "@/components/inventory/warehouse-select";
import { LocationSelect } from "@/components/inventory/location-select";
import type { PurchaseOrder, ReceiveGoodsInput } from "@/types/inventory";
import { getErrorMessage } from "@/lib/get-error-message";
import { getTodayString } from "@/lib/date-utils";
import { GrnLineRow, type DraftLineMeta } from "./receive-goods-line-row";
import {
  grnSchema,
  NO_DISCREPANCY,
  type GrnFormLine,
  type GrnFormValues,
} from "./receive-goods-schema";

export interface ReceiveGoodsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  po: PurchaseOrder;
}

function splitSerials(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * B1 — the same sheet, with somewhere to stop.
 *
 * "Record receipt" used to be the only exit: typing a delivery posted it to the
 * stock ledger, and a clerk who was halfway through a pallet had to either
 * finish or throw the count away. "Save as draft" opens the receipt without
 * moving anything, and it is finished later on the receipts workbench.
 */
export function ReceiveGoodsSheet({ open, onOpenChange, po }: ReceiveGoodsSheetProps) {
  const receiveMutation = useReceiveGoods(po.id);
  const draftMutation = useCreateGrnDraft();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number>(po.warehouseId ?? 0);
  const effectiveWarehouseId = selectedWarehouseId > 0 ? selectedWarehouseId : undefined;

  const pendingLines = po.lines.filter((l) => Number(l.quantity) > Number(l.quantityReceived));
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
        quantityReceived: Math.max(0, Number(l.quantity) - Number(l.quantityReceived)).toFixed(4),
        discrepancyReason: NO_DISCREPANCY,
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

  function handleWarehouseChange(value: string): void {
    setSelectedWarehouseId(Number(value));
    form.resetField("locationId");
  }

  /** The counted lines, or `null` when the count itself does not hold together. */
  function buildLines(values: GrnFormValues): GrnDraftLineInput[] | null {
    const counted = values.lines
      .map((line, index) => ({ line, meta: lineMetas[index] }))
      .filter(({ line }) => Number(line.quantityReceived) > 0);

    if (counted.length === 0) {
      toast.error("Enter a quantity for at least one line");
      return null;
    }

    const payload: GrnDraftLineInput[] = [];
    for (const [position, { line, meta }] of counted.entries()) {
      const isSerial = meta?.trackingMethod === "SERIAL";
      const serials = isSerial ? splitSerials(line.serialNumbers) : undefined;
      if (isSerial && serials!.length !== Math.round(Number(line.quantityReceived))) {
        toast.error(
          `Serial count mismatch on line ${position + 1}: ${serials!.length} entered, ${Math.round(Number(line.quantityReceived))} expected`,
        );
        return null;
      }
      payload.push(toPayloadLine(line, meta, serials));
    }
    return payload;
  }

  function toPayloadLine(
    line: GrnFormLine,
    meta: DraftLineMeta | undefined,
    serials: string[] | undefined,
  ): GrnDraftLineInput {
    const isLot = meta?.trackingMethod === "LOT";
    return {
      poLineId: line.poLineId,
      quantityReceived: line.quantityReceived,
      discrepancyReason:
        line.discrepancyReason && line.discrepancyReason !== NO_DISCREPANCY
          ? line.discrepancyReason
          : undefined,
      qualityStatus: line.qualityStatus,
      rejectionReason: line.qualityStatus === "REJECTED" ? line.rejectionReason : undefined,
      lotNumber: isLot ? line.lotNumber?.trim() || undefined : undefined,
      expiryDate: isLot ? line.expiryDate?.trim() || undefined : undefined,
      manufactureDate: isLot ? line.manufactureDate?.trim() || undefined : undefined,
      serialNumbers: serials && serials.length > 0 ? serials : undefined,
    };
  }

  function handleSaveDraft(): void {
    void form.handleSubmit((values) => {
      const lines = buildLines(values);
      if (!lines) return;
      draftMutation.mutate(
        {
          poId: po.id,
          receivedDate: getTodayString(),
          locationId: values.locationId,
          notes: values.notes?.trim() || undefined,
          lines,
        },
        {
          onSuccess: (grn) => {
            toast.success(`GRN ${grn.grnNumber} saved as a draft — no stock has moved`);
            handleClose();
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    })();
  }

  function handleSubmit(values: GrnFormValues): void {
    const lines = buildLines(values);
    if (!lines) return;
    const payload: ReceiveGoodsInput = {
      locationId: values.locationId,
      receivedDate: getTodayString(),
      notes: values.notes?.trim() || undefined,
      lines,
    };
    receiveMutation.mutate(payload, {
      onSuccess: (grn) => {
        toast.success(`GRN ${grn.grnNumber} posted to stock`);
        handleClose();
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Receive Goods"
      description="Count what arrived. Save it as a draft, or post it to stock now."
      footer={
        <div className="grid w-full grid-flow-col auto-cols-fr gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <LoadingButton
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            isPending={draftMutation.isPending}
            loadingText="Saving…"
          >
            Save as draft
          </LoadingButton>
          <LoadingButton
            type="submit"
            form="receive-goods-form"
            size="sm"
            isPending={receiveMutation.isPending}
            loadingText="Posting…"
          >
            Post to stock
          </LoadingButton>
        </div>
      }
    >
      <Form {...form}>
        <form id="receive-goods-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {!po.warehouseId ? (
            <FormItem>
              <FormLabel>Warehouse *</FormLabel>
              <WarehouseSelect
                value={selectedWarehouseId > 0 ? String(selectedWarehouseId) : ""}
                onChange={handleWarehouseChange}
                activeOnly
              />
            </FormItem>
          ) : null}
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
              return <GrnLineRow key={field.id} meta={meta} index={index} control={form.control} />;
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
