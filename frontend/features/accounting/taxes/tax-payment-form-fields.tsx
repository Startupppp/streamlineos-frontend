"use client";

import { Controller } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaxType } from "@/types/accounting/taxes";

const TAX_TYPES: TaxType[] = [
  "GST",
  "CGST_SGST",
  "IGST",
  "VAT",
  "TDS",
  "TCS",
  "EXEMPT",
  "ZERO_RATED",
];

const TAX_TYPE_OPTIONS: { value: TaxType; label: string }[] = [
  { value: "GST", label: "GST" },
  { value: "CGST_SGST", label: "CGST/SGST" },
  { value: "IGST", label: "IGST" },
  { value: "VAT", label: "VAT" },
  { value: "TDS", label: "TDS" },
  { value: "TCS", label: "TCS" },
  { value: "EXEMPT", label: "Exempt" },
  { value: "ZERO_RATED", label: "Zero Rated" },
];

export const paymentSchema = z.object({
  taxType: z.enum(TAX_TYPES as [TaxType, ...TaxType[]]),
  periodStart: z.string().min(1, "Required"),
  periodEnd: z.string().min(1, "Required"),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount"),
  paidDate: z.string().min(1, "Required"),
  reference: z.string().min(1, "Required"),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;

export const PAYMENT_DEFAULTS: PaymentFormValues = {
  taxType: "GST",
  periodStart: "",
  periodEnd: "",
  amount: "",
  paidDate: "",
  reference: "",
};

interface TaxPaymentFormFieldsProps {
  form: UseFormReturn<PaymentFormValues>;
}

export function TaxPaymentFormFields({ form }: TaxPaymentFormFieldsProps) {
  return (
    <>
      <div className="space-y-1">
        <Label>Tax Type <span className="text-destructive">*</span></Label>
        <Controller
          control={form.control}
          name="taxType"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {TAX_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.taxType && (
          <p className="text-xs text-destructive">{form.formState.errors.taxType.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Period Start <span className="text-destructive">*</span></Label>
          <Input type="date" {...form.register("periodStart")} />
          {form.formState.errors.periodStart && (
            <p className="text-xs text-destructive">
              {form.formState.errors.periodStart.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label>Period End <span className="text-destructive">*</span></Label>
          <Input type="date" {...form.register("periodEnd")} />
          {form.formState.errors.periodEnd && (
            <p className="text-xs text-destructive">
              {form.formState.errors.periodEnd.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label>Amount <span className="text-destructive">*</span></Label>
        <Input type="text" placeholder="e.g. 1500.00" {...form.register("amount")} />
        {form.formState.errors.amount && (
          <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label>Paid Date <span className="text-destructive">*</span></Label>
        <Input type="date" {...form.register("paidDate")} />
        {form.formState.errors.paidDate && (
          <p className="text-xs text-destructive">{form.formState.errors.paidDate.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label>Reference <span className="text-destructive">*</span></Label>
        <Input placeholder="Challan / UTR number" {...form.register("reference")} />
        {form.formState.errors.reference && (
          <p className="text-xs text-destructive">{form.formState.errors.reference.message}</p>
        )}
      </div>
    </>
  );
}
