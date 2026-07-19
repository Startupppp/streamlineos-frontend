"use client";

import { useFormContext, type FieldArrayWithId } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { BillHeaderFields } from "./bill-header-fields";
import { BillGstFields } from "./bill-gst-fields";
import { BillLineItemsEditor } from "./bill-line-items-editor";
import { num } from "./bill-form-schemas";
import type { NewBillFormValues, ComputedTotals } from "./bill-form-schemas";

interface BillNewFormBodyProps {
  fields: FieldArrayWithId<NewBillFormValues, "items">[];
  vendors: Array<{ id: number; clientName: string }>;
  expenseAccounts: Array<{ id: number; code: string; name: string }>;
  computed: ComputedTotals;
  watchedItems: NewBillFormValues["items"];
  watchedDiscount: string;
  watchedStatus: "DRAFT" | "POSTED";
  isPending: boolean;
  onVendorChange: (value: string) => void;
  onVendorGstinChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSupplierGstinChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReverseChargeChange: (checked: boolean | "indeterminate") => void;
  onAddItem: () => void;
  onRemoveItemAt: (index: number) => () => void;
  onCancel: () => void;
}

export function BillNewFormBody({
  fields,
  vendors,
  expenseAccounts,
  computed,
  watchedItems,
  watchedDiscount,
  watchedStatus,
  isPending,
  onVendorChange,
  onVendorGstinChange,
  onSupplierGstinChange,
  onReverseChargeChange,
  onAddItem,
  onRemoveItemAt,
  onCancel,
}: BillNewFormBodyProps) {
  const form = useFormContext<NewBillFormValues>();

  return (
    <div className="space-y-4">
      <BillHeaderFields
        vendors={vendors}
        expenseAccounts={expenseAccounts}
        onVendorChange={onVendorChange}
      />

      <BillGstFields
        onVendorGstinChange={onVendorGstinChange}
        onSupplierGstinChange={onSupplierGstinChange}
        onReverseChargeChange={onReverseChargeChange}
      />

      <BillLineItemsEditor
        fields={fields}
        watchedItems={watchedItems}
        onAddItem={onAddItem}
        onRemoveItemAt={onRemoveItemAt}
      />

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="mt-4">
              <FormField
                control={form.control}
                name="discount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        {...field}
                        className="max-w-xs"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          <div className="space-y-1 text-sm tabular-nums">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{computed.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount</span>
              <span>&#x2212;{num(watchedDiscount).toFixed(2)}</span>
            </div>
            {computed.intra && computed.cgst > 0 && (
              <div className="flex justify-between">
                <span>CGST</span>
                <span>{computed.cgst.toFixed(2)}</span>
              </div>
            )}
            {computed.intra && computed.sgst > 0 && (
              <div className="flex justify-between">
                <span>SGST</span>
                <span>{computed.sgst.toFixed(2)}</span>
              </div>
            )}
            {!computed.intra && computed.igst > 0 && (
              <div className="flex justify-between">
                <span>IGST</span>
                <span>{computed.igst.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-border pt-1 flex justify-between font-medium text-base">
              <span>Total</span>
              <span>{computed.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <LoadingButton
          type="submit"
          className="w-full sm:w-auto"
          isPending={isPending}
          loadingText="Saving…"
        >
          {watchedStatus === "POSTED" ? "Create and post" : "Save as draft"}
        </LoadingButton>
      </div>
    </div>
  );
}