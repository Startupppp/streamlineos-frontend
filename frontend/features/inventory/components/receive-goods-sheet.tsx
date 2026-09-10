"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, type DefaultValues } from "react-hook-form";
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
import { useScanTarget } from "@/features/inventory/hooks/use-scan-target";
import { scanNamesVariant, type ResolvedScan } from "@/features/inventory/lib/scan-resolution";
import { ScanField } from "@/features/inventory/components/scan";
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
  const [activeLineId, setActiveLineId] = useState<number | null>(null);
  const effectiveWarehouseId = selectedWarehouseId > 0 ? selectedWarehouseId : undefined;

  const pendingLines = useMemo(
    () => po.lines.filter((l) => Number(l.quantity) > Number(l.quantityReceived)),
    [po.lines],
  );
  const lineMetas: DraftLineMeta[] = pendingLines.map((l) => ({
    poLineId: l.id,
    productVariantId: l.productVariantId,
    productName: l.productVariant?.product?.name ?? l.productVariant?.name ?? "Product",
    sku: l.productVariant?.sku ?? null,
    ordered: Number(l.quantity),
    alreadyReceived: Number(l.quantityReceived),
    trackingMethod: l.productVariant?.product?.trackingMethod ?? "NONE",
  }));

  const defaults = useMemo<DefaultValues<GrnFormValues>>(
    () => ({
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
    }),
    [pendingLines],
  );

  const form = useForm<GrnFormValues>({
    resolver: zodResolver(grnSchema),
    defaultValues: defaults,
  });

  const { fields } = useFieldArray({ control: form.control, name: "lines" });

  /**
   * B2 — the count a receiver scanned, per PO line.
   *
   * Kept beside the form rather than derived from it, because the two mean
   * different things: the form field starts at what the order still owed, and a
   * tally starts at nothing. Once a line has been scanned even once its count is
   * the tally, so a partial delivery cannot post the ordered quantity because
   * nobody cleared a pre-filled box.
   */
  const [scannedTally, setScannedTally] = useState<Record<number, number>>({});

  useEffect(
    function reseedOnOpen() {
      if (!open) return;
      form.reset(defaults);
      setScannedTally({});
      setActiveLineId(null);
      setSelectedWarehouseId(po.warehouseId ?? 0);
    },
    [open, defaults, form, po.warehouseId],
  );

  const scan = useScanTarget<DraftLineMeta>({
    candidates: lineMetas,
    documentNoun: "delivery",
    match: (meta, resolved) => scanNamesVariant(resolved, meta.productVariantId, meta.sku),
    describe: (meta) => ({
      key: String(meta.poLineId),
      primary: meta.productName,
      secondary: `${meta.sku ?? "no SKU"} · ${(meta.ordered - meta.alreadyReceived).toFixed(2)} outstanding`,
    }),
    acceptedMessage: (meta) =>
      `${meta.productName} — ${(scannedTally[meta.poLineId] ?? 0) + 1} counted.`,
    onResolved: handleScanResolved,
  });

  /**
   * A scanned unit lands on its line, and the grains the label carried land with
   * it. A GS1 label knows its own lot and serial; making the receiver retype
   * them is how a lot number ends up transposed on a receipt that has to answer
   * a recall.
   */
  function handleScanResolved(meta: DraftLineMeta, resolved: ResolvedScan): void {
    const index = lineMetas.findIndex((candidate) => candidate.poLineId === meta.poLineId);
    if (index < 0) return;

    const next = (scannedTally[meta.poLineId] ?? 0) + 1;
    setScannedTally((previous) => ({ ...previous, [meta.poLineId]: next }));
    setActiveLineId(meta.poLineId);
    form.setValue(`lines.${index}.quantityReceived`, next.toFixed(4), { shouldDirty: true });

    if (meta.trackingMethod === "LOT" && resolved.lotNumber) {
      form.setValue(`lines.${index}.lotNumber`, resolved.lotNumber, { shouldDirty: true });
    }
    if (meta.trackingMethod === "SERIAL" && resolved.serialNumber) {
      const existing = form.getValues(`lines.${index}.serialNumbers`) ?? "";
      const already = existing
        .split(/[\n,]/)
        .map((serial) => serial.trim())
        .filter(Boolean);
      if (!already.includes(resolved.serialNumber)) {
        form.setValue(
          `lines.${index}.serialNumbers`,
          [...already, resolved.serialNumber].join("\n"),
          { shouldDirty: true },
        );
      }
    }
  }

  function handleActivateLine(poLineId: number): void {
    setActiveLineId((current) => (current === poLineId ? null : poLineId));
  }

  function handleClose(): void {
    form.reset();
    setScannedTally({});
    setActiveLineId(null);
    setSelectedWarehouseId(po.warehouseId ?? 0);
    onOpenChange(false);
  }

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      form.reset(defaults);
      setScannedTally({});
      setActiveLineId(null);
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
        <form id="receive-goods-form" onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
          <ScanField
            scan={scan}
            label="Scan a unit as it comes off the pallet"
            placeholder="Barcode, GTIN, SKU, lot or serial"
            sticky
          />
          {!po.warehouseId ? (
            <FormItem>
              <FormLabel>Warehouse *</FormLabel>
              <WarehouseSelect
                value={selectedWarehouseId > 0 ? String(selectedWarehouseId) : ""}
                onChange={handleWarehouseChange}
                activeOnly
                ariaLabel="Warehouse"
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
                    ariaLabel="Receive at Location"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-col gap-2">
            {fields.map((field, index) => {
              const meta = lineMetas[index];
              if (!meta) return null;
              return (
                <GrnLineRow
                  key={field.id}
                  meta={meta}
                  index={index}
                  control={form.control}
                  scannedCount={scannedTally[meta.poLineId] ?? 0}
                  isActive={activeLineId === meta.poLineId}
                  onActivate={handleActivateLine}
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
