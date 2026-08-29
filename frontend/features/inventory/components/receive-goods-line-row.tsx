"use client";

import { memo } from "react";
import { useWatch, type Control } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  GRN_DISCREPANCY_LABEL,
  type GrnDiscrepancyReason,
} from "@/features/inventory/lib/inventory-status";
import type { TrackingMethod } from "@/types/inventory";
import type { GrnFormValues } from "./receive-goods-schema";

const DISCREPANCY_OPTIONS: GrnDiscrepancyReason[] = ["SHORT", "OVER", "DAMAGED", "WRONG_ITEM"];

export interface DraftLineMeta {
  productName: string;
  sku: string | null;
  ordered: number;
  alreadyReceived: number;
  trackingMethod: TrackingMethod;
}

interface GrnLineRowProps {
  meta: DraftLineMeta;
  index: number;
  control: Control<GrnFormValues>;
}

/**
 * One line of a delivery, as the receiver sees it on the dock.
 *
 * The discrepancy reason is the field B1 adds. It was in the payload type and
 * in the schema and had no control anywhere, so `SHORT` and `DAMAGED` could be
 * stored by the API and never entered by a human — the receipt recorded that
 * eight of ten arrived and no way to say why.
 */
export const GrnLineRow = memo(function GrnLineRow({ meta, index, control }: GrnLineRowProps) {
  const qualityStatus = useWatch({ control, name: `lines.${index}.qualityStatus` });
  const quantityReceived = useWatch({ control, name: `lines.${index}.quantityReceived` });
  const serialNumbersValue = useWatch({ control, name: `lines.${index}.serialNumbers` });
  const outstanding = meta.ordered - meta.alreadyReceived;
  const entered = Number(quantityReceived);
  // Offered whenever the count is not what the order still owed, and kept
  // available otherwise — damage is a discrepancy at the right quantity.
  const suggestReason = Number.isFinite(entered) && entered !== outstanding;
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
        {meta.sku ? <div className="text-xs text-muted-foreground font-mono">{meta.sku}</div> : null}
        <div className="text-xs text-muted-foreground mt-0.5">
          Ordered: {meta.ordered.toFixed(2)} · Received: {meta.alreadyReceived.toFixed(2)} ·
          Outstanding: {outstanding.toFixed(2)}
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
                  step="0.0001"
                  className="w-28 text-right tabular-nums"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
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
      <FormField
        control={control}
        name={`lines.${index}.discrepancyReason`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">
              Discrepancy reason
              {suggestReason ? <span className="ml-1 text-muted-foreground">(count differs)</span> : null}
            </FormLabel>
            <Select value={field.value ?? "none"} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="No discrepancy" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                <SelectItem value="none">No discrepancy</SelectItem>
                {DISCREPANCY_OPTIONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {GRN_DISCREPANCY_LABEL[reason]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      {qualityStatus === "REJECTED" ? (
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
      ) : null}
      {meta.trackingMethod === "LOT" ? (
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
                  <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" />
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
                  <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ) : null}
      {meta.trackingMethod === "SERIAL" ? (
        <FormField
          control={control}
          name={`lines.${index}.serialNumbers`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">
                Serial numbers
                <span className="ml-2 text-muted-foreground">
                  {serialCount} / {entered > 0 ? Math.round(entered) : "?"} entered
                </span>
              </FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="One serial per line or comma-separated"
                  className="resize-none font-mono text-xs"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
    </div>
  );
});
