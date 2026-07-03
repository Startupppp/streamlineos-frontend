"use client";

import { useForm, useFieldArray, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useReceiveGoods, useLocations } from "@/hooks/api/inventory";
import type { PurchaseOrder, ReceiveGoodsInput, ReceiveGoodsLineInput } from "@/types/inventory";

const grnSchema = z.object({
  locationId: z.number({ error: "Location is required" }).int().positive(),
  notes: z.string().max(500).optional(),
  lines: z
    .array(
      z.object({
        poLineId: z.number(),
        quantityReceived: z.number().min(0),
        qualityStatus: z.enum(["ACCEPTED", "REJECTED"]),
        rejectionReason: z.string().optional(),
      }),
    )
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
}

export interface ReceiveGoodsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  po: PurchaseOrder;
}

interface GrnLineRowProps {
  meta: DraftLineMeta;
  index: number;
  control: Control<GrnFormValues>;
  qualityStatus: "ACCEPTED" | "REJECTED";
}

function GrnLineRow({ meta, index, control, qualityStatus }: GrnLineRowProps) {
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
                <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-3">
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
    </div>
  );
}

export function ReceiveGoodsSheet({ open, onOpenChange, po }: ReceiveGoodsSheetProps) {
  const receiveMutation = useReceiveGoods(po.id);
  const locationsQuery = useLocations(po.warehouseId ?? 0);
  const activeLocations = (locationsQuery.data ?? []).filter((l) => l.isActive);

  const pendingLines = po.lines.filter(
    (l) => Number(l.quantity) > Number(l.quantityReceived),
  );
  const lineMetas: DraftLineMeta[] = pendingLines.map((l) => ({
    productName: l.productVariant?.product?.name ?? l.productVariant?.name ?? "Product",
    sku: l.productVariant?.sku ?? null,
    ordered: Number(l.quantity),
    alreadyReceived: Number(l.quantityReceived),
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
      })),
    },
  });

  const { fields } = useFieldArray({ control: form.control, name: "lines" });
  const watchedLines = form.watch("lines");

  function handleClose(): void {
    form.reset();
    onOpenChange(false);
  }

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) form.reset();
    onOpenChange(nextOpen);
  }

  async function onSubmit(values: GrnFormValues): Promise<void> {
    const activeLines = values.lines.filter((l) => l.quantityReceived > 0);
    if (activeLines.length === 0) {
      toast.error("Enter quantity for at least one line");
      return;
    }
    const payload: ReceiveGoodsInput = {
      locationId: values.locationId,
      notes: values.notes?.trim() || undefined,
      lines: activeLines.map<ReceiveGoodsLineInput>((l) => ({
        poLineId: l.poLineId,
        quantityReceived: l.quantityReceived,
        qualityStatus: l.qualityStatus,
        rejectionReason: l.qualityStatus === "REJECTED" ? l.rejectionReason : undefined,
      })),
    };
    try {
      const grn = await receiveMutation.mutateAsync(payload);
      toast.success(`GRN ${grn.grnNumber} recorded`);
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to receive goods");
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
          <Button
            type="submit"
            form="receive-goods-form"
            size="sm"
            disabled={receiveMutation.isPending}
          >
            {receiveMutation.isPending ? "Recording…" : "Record receipt"}
          </Button>
        </div>
      }
    >
      <Form {...form}>
        <form id="receive-goods-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="locationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Receive at Location *</FormLabel>
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                  disabled={locationsQuery.isLoading || !po.warehouseId}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={locationsQuery.isLoading ? "Loading…" : "Select a location"}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {activeLocations.map((loc) => (
                      <SelectItem key={loc.id} value={String(loc.id)}>
                        {loc.name} ({loc.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  qualityStatus={watchedLines[index]?.qualityStatus ?? "ACCEPTED"}
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
