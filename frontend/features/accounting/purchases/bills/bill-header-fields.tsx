"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { addDaysToIso } from "../lib/ap-dates";
import type { VendorSummary } from "@/types/accounting/accounting-ap";
import type { BillFormValues } from "./bill-form-schema";
import { VendorPickerField } from "./vendor-picker-field";

interface BillHeaderFieldsProps {
  form: UseFormReturn<BillFormValues>;
  lockVendor?: boolean;
  onVendorSelected?: (vendor: VendorSummary) => void;
}

export function BillHeaderFields({
  form,
  lockVendor = false,
  onVendorSelected,
}: BillHeaderFieldsProps) {
  function handleVendorChange(
    partyId: string,
    vendor: VendorSummary | undefined,
  ): void {
    form.setValue("partyId", partyId, { shouldValidate: true });
    if (!vendor) return;
    onVendorSelected?.(vendor);
    form.setValue("currency", vendor.defaultCurrency);
    const issueDate = form.getValues("issueDate");
    if (issueDate)
      form.setValue(
        "dueDate",
        addDaysToIso(issueDate, vendor.paymentTermsDays),
      );
  }

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="partyId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Vendor</FormLabel>
            <FormControl>
              <VendorPickerField
                value={field.value}
                onChange={handleVendorChange}
                disabled={lockVendor}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="vendorDocumentNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Their bill number</FormLabel>
              <FormControl>
                <Input {...field} placeholder="INV-2026-0481" />
              </FormControl>
              <FormDescription>
                Exactly as printed. Entering the same number twice for one
                vendor is refused.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="vendorDocumentDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date on their bill</FormLabel>
              <FormControl>
                <DatePicker value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          control={form.control}
          name="issueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Record it on</FormLabel>
              <FormControl>
                <DatePicker value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pay by</FormLabel>
              <FormControl>
                <DatePicker value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <FormControl>
                <Input {...field} maxLength={3} placeholder="INR" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="placeOfSupplyCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Place of supply</FormLabel>
              <FormControl>
                <Input {...field} maxLength={8} placeholder="29" />
              </FormControl>
              <FormDescription>
                Leave blank to use the vendor&apos;s own region.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your reference</FormLabel>
              <FormControl>
                <Input {...field} placeholder="PO-1183" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="memo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Note</FormLabel>
            <FormControl>
              <Textarea {...field} rows={2} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
