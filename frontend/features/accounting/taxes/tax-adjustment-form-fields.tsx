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

const SYSTEM_PURPOSE_OPTIONS = [
  { value: "TAX_PAYABLE", label: "Tax Payable" },
  { value: "TAX_RECEIVABLE", label: "Tax Receivable" },
  { value: "CUSTOM", label: "Custom" },
] as const;

const lineSchema = z.object({
  systemPurpose: z.enum(["TAX_PAYABLE", "TAX_RECEIVABLE", "CUSTOM"]),
  debit: z.string().min(1, "Required"),
  credit: z.string().min(1, "Required"),
  lineDescription: z.string().min(1, "Required"),
});

export const adjustmentSchema = z.object({
  entryDate: z.string().min(1, "Required"),
  description: z.string().min(1, "Required"),
  line1: lineSchema,
  line2: lineSchema,
});

export type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;

export const ADJUSTMENT_DEFAULTS: AdjustmentFormValues = {
  entryDate: "",
  description: "",
  line1: { systemPurpose: "TAX_PAYABLE", debit: "", credit: "", lineDescription: "" },
  line2: { systemPurpose: "TAX_RECEIVABLE", debit: "", credit: "", lineDescription: "" },
};

interface TaxAdjustmentFormFieldsProps {
  form: UseFormReturn<AdjustmentFormValues>;
}

export function TaxAdjustmentFormFields({ form }: TaxAdjustmentFormFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Entry Date <span className="text-destructive">*</span></Label>
          <Input type="date" {...form.register("entryDate")} />
          {form.formState.errors.entryDate && (
            <p className="text-xs text-destructive">
              {form.formState.errors.entryDate.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label>Description <span className="text-destructive">*</span></Label>
          <Input placeholder="Adjustment reason" {...form.register("description")} />
          {form.formState.errors.description && (
            <p className="text-xs text-destructive">
              {form.formState.errors.description.message}
            </p>
          )}
        </div>
      </div>

      {(["line1", "line2"] as const).map((lineKey, idx) => (
        <div key={lineKey} className="rounded-lg border border-border p-3 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Line {idx + 1}
          </p>
          <div className="space-y-1">
            <Label>Purpose</Label>
            <Controller
              control={form.control}
              name={`${lineKey}.systemPurpose`}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    {SYSTEM_PURPOSE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Debit</Label>
              <Input
                type="text"
                placeholder="0.00"
                {...form.register(`${lineKey}.debit`)}
              />
              {form.formState.errors[lineKey]?.debit && (
                <p className="text-xs text-destructive">
                  {form.formState.errors[lineKey]?.debit?.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Credit</Label>
              <Input
                type="text"
                placeholder="0.00"
                {...form.register(`${lineKey}.credit`)}
              />
              {form.formState.errors[lineKey]?.credit && (
                <p className="text-xs text-destructive">
                  {form.formState.errors[lineKey]?.credit?.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Line Description</Label>
            <Input
              placeholder="e.g. Tax payable reversal"
              {...form.register(`${lineKey}.lineDescription`)}
            />
            {form.formState.errors[lineKey]?.lineDescription && (
              <p className="text-xs text-destructive">
                {form.formState.errors[lineKey]?.lineDescription?.message}
              </p>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
