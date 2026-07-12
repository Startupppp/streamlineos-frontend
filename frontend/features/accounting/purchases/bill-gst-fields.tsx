"use client";

import { useFormContext } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { INDIAN_STATES } from "@/lib/accounting/indian-states";
import type { NewBillFormValues } from "./bill-form-schemas";

interface BillGstFieldsProps {
  onVendorGstinChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSupplierGstinChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReverseChargeChange: (checked: boolean | "indeterminate") => void;
}

export function BillGstFields({
  onVendorGstinChange,
  onSupplierGstinChange,
  onReverseChargeChange,
}: BillGstFieldsProps) {
  const form = useFormContext<NewBillFormValues>();

  return (
    <Card className="p-4">
      <div className="text-sm font-medium mb-3">GST</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="placeOfSupply"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Place of supply</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-72">
                  {INDIAN_STATES.map((s) => (
                    <SelectItem key={s.stateCode} value={s.stateCode}>
                      {s.stateCode} — {s.stateName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="vendorGstin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vendor GSTIN</FormLabel>
              <FormControl>
                <Input
                  name={field.name}
                  value={field.value}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  onChange={onVendorGstinChange}
                  placeholder="15-char GSTIN"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="supplierGstin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your GSTIN</FormLabel>
              <FormControl>
                <Input
                  name={field.name}
                  value={field.value}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  onChange={onSupplierGstinChange}
                  placeholder="15-char GSTIN"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="sm:col-span-3">
          <FormField
            control={form.control}
            name="reverseCharge"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    id="reverse-charge"
                    checked={field.value}
                    onCheckedChange={onReverseChargeChange}
                  />
                </FormControl>
                <FormLabel
                  htmlFor="reverse-charge"
                  className="text-sm cursor-pointer leading-none"
                >
                  Reverse charge applies
                </FormLabel>
              </FormItem>
            )}
          />
        </div>
      </div>
    </Card>
  );
}
